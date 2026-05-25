import React, { useState, useEffect, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleRedirect } from '@/hooks/useRoleRedirect';
import { useLanguage } from '@/i18n/LanguageContext';
import { authService, useOtpFlow, countryCodes } from '@/services/auth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { User, Building2, Phone, Check, Loader2, CheckCircle2, ArrowLeft, ArrowRight, AlertCircle, Mail, UserPlus } from 'lucide-react';
import { track } from '@/lib/analytics-events';
import { usePageMeta } from '@/hooks/usePageMeta';
import { SectorPicker } from '@/components/onboarding/SectorPicker';
import type { SectorId } from '@/data/onboarding-sectors';
import { supabase } from '@/integrations/supabase/client';
import { updateOnboardingProgress } from '@/modules/users';
import { UsernamePicker } from '@/components/common/UsernamePicker';
import {
  readDraft,
  saveDraft,
  clearDraft,
  pullRemoteDraft,
  syncDraftToServer,
} from '@/lib/onboarding-draft';
import {
  createEntityAccessRequest,
  findPossibleDuplicateEntities,
  type PossibleDuplicateEntity,
} from '@/modules/entities/services/access';
import { insertBusinessBranch } from '@/modules/businesses';
import { EntityVerificationStatusBadge } from '@/components/entities/EntityVerificationStatusBadge';

type OnboardingStep =
  | 'intent'
  | 'account-type'
  | 'details'
  | 'phone-verify'
  | 'business-details'
  | 'entity-type'
  | 'entity-capabilities'
  | 'business-sectors'
  | 'main-location'
  | 'staff-invite'
  | 'summary';

const STEP_ORDER: OnboardingStep[] = [
  'intent',
  'account-type',
  'details',
  'phone-verify',
  'business-details',
  'entity-type',
  'entity-capabilities',
  'business-sectors',
  'main-location',
  'staff-invite',
  'summary',
];

/**
 * REGISTRATION-UX-FULL-COMPLETE-1 Part 3
 * Allowed location types for the onboarding main-location step.
 * Public-sector / state-entity wording is intentionally excluded.
 */
type LocationType =
  | 'headquarters'
  | 'branch'
  | 'office'
  | 'factory'
  | 'warehouse'
  | 'project_site'
  | 'service_site'
  | 'client_site'
  | 'other';

const LOCATION_TYPES: { id: LocationType; ar: string; en: string }[] = [
  { id: 'headquarters', ar: 'المقر الرئيسي', en: 'Headquarters' },
  { id: 'branch', ar: 'فرع', en: 'Branch' },
  { id: 'office', ar: 'مكتب', en: 'Office' },
  { id: 'factory', ar: 'مصنع', en: 'Factory' },
  { id: 'warehouse', ar: 'مستودع', en: 'Warehouse' },
  { id: 'project_site', ar: 'موقع مشروع', en: 'Project site' },
  { id: 'service_site', ar: 'موقع خدمة', en: 'Service site' },
  { id: 'client_site', ar: 'موقع عميل', en: 'Client site' },
  { id: 'other', ar: 'أخرى', en: 'Other' },
];

/**
 * REGISTRATION-UX-FULL-COMPLETE-1
 * Supported entity types. Public-sector / state entities are intentionally
 * excluded from the registration UI per approved architecture (Model D).
 */
type EntityType =
  | 'company'
  | 'establishment'
  | 'individual_business'
  | 'private_entity'
  | 'service_provider'
  | 'buyer_entity'
  | 'other';

type CapabilityMode = 'provider' | 'buyer' | 'both';

function capabilitiesFromMode(mode: CapabilityMode): Record<string, boolean> {
  const isProvider = mode === 'provider' || mode === 'both';
  const isBuyer = mode === 'buyer' || mode === 'both';
  return {
    can_provide_services: isProvider,
    can_request_services: isBuyer,
    can_manage_contracts: true,
    can_issue_quotes: isProvider,
    can_receive_quotes: isBuyer,
  };
}

const Onboarding = () => {
  const { t, language, isRTL } = useLanguage();
  usePageMeta({ title: isRTL ? 'إعداد الحساب' : 'Account Setup', noindex: true });
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
  const [businessName, setBusinessName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameOk, setUsernameOk] = useState(false);
  const [businessDescription, setBusinessDescription] = useState('');
  const [sectors, setSectors] = useState<SectorId[]>([]);
  const [subServices, setSubServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Entity-creation extras (additive — backward-compatible)
  const [entityType, setEntityType] = useState<EntityType>('company');
  const [tradeName, setTradeName] = useState('');
  const [crNumber, setCrNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [capabilityMode, setCapabilityMode] = useState<CapabilityMode>('both');
  const [duplicates, setDuplicates] = useState<PossibleDuplicateEntity[]>([]);
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);
  const [duplicateChecking, setDuplicateChecking] = useState(false);

  // REGISTRATION-UX-FULL-COMPLETE-1 Part 3 — main-location state
  const [locationName, setLocationName] = useState('');
  const [locationType, setLocationType] = useState<LocationType>('headquarters');
  const [locationCity, setLocationCity] = useState('');
  const [locationAddress1, setLocationAddress1] = useState('');
  const [locationAddress2, setLocationAddress2] = useState('');
  const [locationPostalCode, setLocationPostalCode] = useState('');
  const [locationWarning, setLocationWarning] = useState<string | null>(null);
  const [createdEntityStatus, setCreatedEntityStatus] = useState<{
    approvalStatus?: string | null;
    isVerified?: boolean | null;
  } | null>(null);

  // Persist draft on every relevant change
  useEffect(() => {
    if (!draftLoaded) return;
    saveDraft({
      step, accountType, fullName, phone, countryCode,
      businessName, username,
      description: businessDescription,
      sectors, subServices,
    });
    if (user?.id) void syncDraftToServer(user.id);
  }, [step, accountType, fullName, phone, countryCode, businessName, username,
      businessDescription, sectors, subServices, draftLoaded, user?.id]);

  // Track step views (no PII) + persist current step index to profile
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
      toast.success(isRTL ? 'تم التحقق من رقم الجوال بنجاح' : 'Phone verified successfully');
      await refreshProfile();
      if (accountType === 'business') {
        setStep('business-details');
      } else {
        await completeOnboarding();
      }
    },
  });

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    // Admins bypass onboarding entirely.
    if (isAdmin || isSuperAdmin) { navigate(getTargetRoute(), { replace: true }); return; }
    // Onboarding gate (post AUTH-PHONE-VERIFY-1 redesign):
    //   `is_onboarded === true` is the single source of truth — anyone who
    //   hasn't completed it lands here regardless of account_type, so phone-
    //   OTP signups get a chance to confirm name + type instead of being
    //   silently routed to /dashboard with an incomplete profile.
    // Allow the user to stay on the post-completion summary screen even
    // after `is_onboarded` flips true (refreshProfile fires before redirect).
    if (profile?.is_onboarded && step !== 'summary') { navigate(getTargetRoute()); return; }
    let cancelled = false;
    (async () => {
      const draft = await pullRemoteDraft(user.id);
      const local = readDraft();
      const d = { ...local, ...draft };
      if (cancelled) return;
      // Profile takes precedence for identity fields
      if (profile?.full_name) setFullName(profile.full_name);
      else if (d.fullName) setFullName(d.fullName);
      else if (user?.user_metadata?.full_name) setFullName(user.user_metadata.full_name);
      // Profile is the source of truth for account_type. Only fall back to
      // the local/remote draft when the profile has no value yet.
      const effectiveAccountType: 'individual' | 'business' =
        (profile?.account_type as 'individual' | 'business' | undefined) ??
        (d.accountType as 'individual' | 'business' | undefined) ??
        'individual';
      setAccountType(effectiveAccountType);
      if (d.phone) setPhone(d.phone);
      if (d.countryCode) setCountryCode(d.countryCode);
      if (d.businessName) setBusinessName(d.businessName);
      if (d.username) setUsername(d.username);
      if (d.description) setBusinessDescription(d.description);
      if (d.sectors?.length) setSectors(d.sectors as SectorId[]);
      if (d.subServices?.length) setSubServices(d.subServices);
      if (d.step && STEP_ORDER.includes(d.step as OnboardingStep)) {
        const draftStep = d.step as OnboardingStep;
        // Never resume on business-only steps when the account is individual —
        // prevents a stale draft from a previous session forcing the provider flow.
        const isBusinessOnlyStep =
          draftStep === 'business-details' || draftStep === 'business-sectors';
      if (effectiveAccountType === 'individual' && isBusinessOnlyStep) {
          clearDraft();
          setStep('details');
        } else {
          setStep(draftStep);
        }
      } else {
        // REGISTRATION-UX-VISIBLE-FIX — honor pending intent picked on the
        // /auth?mode=register screen so /onboarding does not show the
        // intent step again. We still surface invite / request-access
        // affordances later in the flow.
        try {
          const pending = localStorage.getItem('qitaat_pending_intent');
          if (pending === 'create-entity' || pending === 'individual'
              || pending === 'join-invite' || pending === 'request-access') {
            if (pending === 'create-entity') setAccountType('business');
            else setAccountType('individual');
            setStep(pending === 'create-entity' ? 'business-details' : 'details');
            localStorage.removeItem('qitaat_pending_intent');
          }
        } catch { /* storage unavailable — non-blocking */ }
      }
      setDraftLoaded(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile, isAdmin, isSuperAdmin, getTargetRoute, navigate]);

  // Completion percentage for the header progress bar
  const completionPct = useMemo(() => {
    let total = 3; // account type, full name, account creation
    let done = 1; // account type implicit
    if (fullName.trim()) done++;
    if (accountType === 'business') {
      total += 4; // name, username, description, sectors
      if (businessName.trim()) done++;
      if (username.length >= 3) done++;
      if (businessDescription.trim()) done++;
      if (sectors.length > 0) done++;
    }
    if (phone && phone.length >= 7) { total += 1; done += 1; }
    return Math.min(100, Math.round((done / total) * 100));
  }, [fullName, accountType, businessName, username, businessDescription, sectors, phone]);

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      await authService.updateProfile(user!.id, {
        full_name: fullName,
        account_type: accountType,
        is_onboarded: true,
        ...(phone && !profile?.phone_verified ? { phone: `${countryCode}${phone}`, country_code: countryCode } : {}),
      });

      if (accountType === 'business' && businessName && username) {
        await authService.createBusiness(user!.id, businessName, username, {
          sectors,
          sub_services: subServices,
          description_ar: businessDescription || undefined,
          recipientEmail: user?.email || undefined,
          entity_type: entityType,
          capabilities: capabilitiesFromMode(capabilityMode),
          national_id: crNumber || undefined,
          vat_number: vatNumber || undefined,
          website: websiteUrl || undefined,
        });

        // Resolve the just-created business id so we can attach the main
        // location. This is intentionally non-blocking: if anything fails
        // we surface a warning on the summary and let the user add a
        // location later from the dashboard.
        try {
          const { data: bizRow } = await supabase
            .from('businesses')
            .select('id, approval_status, is_verified')
            .eq('user_id', user!.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          const businessId = (bizRow as { id?: string } | null)?.id ?? null;
          if (bizRow) {
            setCreatedEntityStatus({
              approvalStatus: (bizRow as { approval_status?: string | null }).approval_status ?? null,
              isVerified: (bizRow as { is_verified?: boolean | null }).is_verified ?? null,
            });
          }
          if (businessId && locationName.trim()) {
            const nameTrim = locationName.trim();
            const addr = [locationAddress1.trim(), locationAddress2.trim()]
              .filter(Boolean)
              .join(' — ');
            const { error: branchErr } = await insertBusinessBranch({
              payload: {
                business_id: businessId,
                name_ar: nameTrim,
                name_en: nameTrim,
                is_main: locationType === 'headquarters',
                location_type: locationType,
                region: locationCity.trim() || null,
                address: addr || null,
                additional_number: locationPostalCode.trim() || null,
              },
            });
            if (branchErr) {
              setLocationWarning(
                isRTL
                  ? 'تم حفظ المنشأة لكن تعذّر حفظ الموقع الرئيسي. يمكنك إضافته لاحقاً من إعدادات المنشأة.'
                  : 'Your entity was saved but the main location could not be created. You can add it later from entity settings.',
              );
            }
          }
        } catch {
          setLocationWarning(
            isRTL
              ? 'تعذّر تأكيد حفظ الموقع. يمكنك إضافته لاحقاً من إعدادات المنشأة.'
              : 'Could not confirm the location was saved. You can add it later from entity settings.',
          );
        }
      }

      await refreshProfile();
      clearDraft();
      // provider_signup_submit fires only when a business profile is created.
      if (accountType === 'business') {
        track.providerSignupSubmit({});
      }
      track.onboardingCompleted({ account_type: accountType });
      toast.success(isRTL ? 'تم حفظ بيانات منشأتك' : 'Your business profile is saved');

      if (accountType === 'business') {
        // Show end-of-onboarding summary instead of redirecting immediately.
        setStep('summary');
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      const fallback = isRTL
        ? 'تعذّر إكمال التسجيل. يرجى المحاولة مرة أخرى.'
        : 'Could not complete registration. Please try again.';
      toast.error(err instanceof Error && err.message ? err.message : fallback);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipPhone = async () => {
    if (accountType === 'business') setStep('business-details');
    else await completeOnboarding();
  };

  const handlePhoneSend = async () => {
    if (!phone || phone.length < 7) {
      toast.error(isRTL ? 'يرجى إدخال رقم جوال صحيح' : 'Please enter a valid phone number');
      return;
    }
    const ok = await otp.sendOtp();
    if (ok) toast.success(isRTL ? 'تم إرسال رمز التحقق' : 'Verification code sent');
    else if (otp.error) toast.error(otp.error);
  };

  const handlePhoneVerify = async () => {
    const ok = await otp.verifyOtp();
    if (!ok && otp.error) toast.error(otp.error);
  };

  if (isAdmin || isSuperAdmin) {
    return <Navigate to={getTargetRoute()} replace />;
  }

  // REGISTRATION-UX-IMPLEMENTATION-P1 — Intent Selection (Model D)
  // Four intents. Public-sector entities are excluded by design. Existing flows preserved.
  if (step === 'intent') {
    const intents = [
      {
        id: 'individual' as const,
        icon: User,
        titleAr: 'المتابعة كفرد',
        titleEn: 'Continue as individual',
        descAr: 'يمكنك استخدام قطاعات كفرد، وطلب عروض الأسعار، ثم إنشاء منشأة أو الانضمام لها لاحقًا.',
        descEn: 'You can use Qitaat as an individual, request quotes, and create or join an entity later.',
      },
      {
        id: 'create-entity' as const,
        icon: Building2,
        titleAr: 'إنشاء منشأة أو شركة',
        titleEn: 'Create a business/entity',
        descAr: 'إنشاء ملف منشأة (مزوّد، مشتري، أو الاثنين)',
        descEn: 'Create an entity profile (provider, buyer, or both)',
      },
      {
        id: 'join-invite' as const,
        icon: Mail,
        titleAr: 'الانضمام بدعوة',
        titleEn: 'Join by invitation',
        descAr: 'لديّ رمز دعوة من منشأة قائمة',
        descEn: 'I have an invitation token from an existing entity',
      },
      {
        id: 'request-access' as const,
        icon: UserPlus,
        titleAr: 'طلب الانضمام لمنشأة قائمة',
        titleEn: 'Request access to an existing entity',
        descAr: 'ابحث بالاسم أو معرّف ENT- / BIZ- وأرسل طلباً للمالك',
        descEn: 'Search by name or ENT- / BIZ- reference and send a request to the owner',
      },
    ];
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-heading font-bold text-2xl text-foreground">
              {isRTL ? 'كيف تريد البدء؟' : 'How would you like to start?'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'اختر المسار الأنسب لك — يمكنك إضافة منشأة لاحقاً.' : 'Pick the path that fits you — you can add an entity later.'}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {intents.map(({ id, icon: Icon, titleAr, titleEn, descAr, descEn }) => (
              <button
                key={id}
                data-intent={id}
                onClick={() => {
                  if (id === 'individual') {
                    setAccountType('individual');
                    setStep('details');
                  } else if (id === 'create-entity') {
                    setAccountType('business');
                    setStep('details');
                  }
                  // join-invite & request-access render inline panels below
                }}
                className="p-4 rounded-xl border-2 border-border hover:border-gold/50 transition-all text-start group flex items-start gap-3"
                aria-label={isRTL ? titleAr : titleEn}
              >
                <div className="rounded-lg bg-gold/10 p-2 shrink-0">
                  <Icon className="w-5 h-5 text-gold" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-bold text-base text-foreground">
                    {isRTL ? titleAr : titleEn}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isRTL ? descAr : descEn}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Join by invitation — inline token entry, uses existing /invite/:token */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
            <Label className="text-xs">
              {isRTL ? 'لديك رمز دعوة؟' : 'Have an invitation token?'}
            </Label>
            <div className="flex gap-2">
              <Input
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value.trim())}
                placeholder={isRTL ? 'الصق رمز الدعوة' : 'Paste invitation token'}
                dir="auto"
                aria-label={isRTL ? 'رمز الدعوة' : 'Invitation token'}
              />
              <Button
                variant="outline"
                disabled={inviteToken.length < 6}
                onClick={() => navigate(`/invite/${encodeURIComponent(inviteToken)}`)}
              >
                {isRTL ? 'متابعة' : 'Continue'}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isRTL
                ? 'سيتم توجيهك لقبول الدعوة. الدعوات النشطة فقط ستعمل.'
                : 'You will be redirected to accept. Only active invitations work.'}
            </p>
          </div>

          {/* Request access — REGISTRATION-UX-FULL-COMPLETE-1, functional MVP */}
          <div className="rounded-xl border border-border/60 bg-muted/10 p-3 space-y-2" data-feature="request-access">
            <Label className="text-xs">
              {isRTL ? 'طلب الانضمام لمنشأة قائمة' : 'Request access to an existing entity'}
            </Label>
            {requestAccessSubmittedRef ? (
              <div className="rounded-md bg-success/10 border border-success/30 p-2 text-xs text-success-foreground">
                {isRTL
                  ? `تم إرسال طلبك (${requestAccessSubmittedRef}). سيتم إشعارك عند مراجعته.`
                  : `Your request was sent (${requestAccessSubmittedRef}). You will be notified when it is reviewed.`}
              </div>
            ) : (
              <>
                <Input
                  value={requestAccessQuery}
                  onChange={(e) => setRequestAccessQuery(e.target.value)}
                  placeholder={isRTL ? 'اسم المنشأة أو معرّفها ENT- / BIZ-' : 'Entity name or ENT- / BIZ- reference'}
                  dir="auto"
                  aria-label={isRTL ? 'طلب الانضمام' : 'Request access'}
                />
                <Textarea
                  value={requestAccessMessage}
                  onChange={(e) => setRequestAccessMessage(e.target.value.slice(0, 500))}
                  placeholder={isRTL ? 'رسالة قصيرة لمالك المنشأة (اختياري)' : 'Short message to the entity owner (optional)'}
                  rows={2}
                  dir="auto"
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    {isRTL
                      ? 'سيُرسل الطلب للمراجعة. لن يتم منح صلاحيات تلقائياً.'
                      : 'Your request will be reviewed. Access is not granted automatically.'}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!user || requestAccessQuery.trim().length < 2 || requestAccessSubmitting}
                    onClick={async () => {
                      if (!user) return;
                      setRequestAccessSubmitting(true);
                      try {
                        const q = requestAccessQuery.trim();
                        const looksLikeRef = /^(ENT|BIZ)-/i.test(q);
                        let targetBusinessId: string | null = null;
                        if (looksLikeRef) {
                          const { data } = await supabase
                            .from('businesses')
                            .select('id')
                            .or(`ref_id.eq.${q.toUpperCase()},legacy_ref_id.eq.${q.toUpperCase()}`)
                            .limit(1)
                            .maybeSingle();
                          targetBusinessId = (data as { id?: string } | null)?.id ?? null;
                        }
                        const { data, error } = await createEntityAccessRequest({
                          requesterUserId: user.id,
                          targetBusinessId,
                          targetRef: targetBusinessId ? null : q,
                          message: requestAccessMessage.trim() || null,
                        });
                        if (error) throw error;
                        if (data?.ref_id) {
                          setRequestAccessSubmittedRef(data.ref_id);
                          toast.success(isRTL ? 'تم إرسال طلب الانضمام' : 'Access request sent');
                        }
                      } catch (err) {
                        toast.error(
                          err instanceof Error && err.message
                            ? err.message
                            : isRTL ? 'تعذّر إرسال الطلب' : 'Could not send the request',
                        );
                      } finally {
                        setRequestAccessSubmitting(false);
                      }
                    }}
                  >
                    {requestAccessSubmitting
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : (isRTL ? 'إرسال الطلب' : 'Send request')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (step === 'account-type') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-heading font-bold text-2xl text-foreground">{isRTL ? 'مرحباً بك في قِطاعات' : 'Welcome to Qitaat'}</h2>
            <p className="text-sm text-muted-foreground">{isRTL ? 'اختر نوع حسابك للمتابعة' : 'Choose your account type to continue'}</p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <button onClick={() => { setAccountType('individual'); setStep('details'); }}
              className="p-6 rounded-xl border-2 border-border hover:border-gold/50 transition-all text-center group">
              <User className="w-10 h-10 mx-auto mb-3 text-gold group-hover:scale-110 transition-transform" />
              <h3 className="font-heading font-bold text-lg">{isRTL ? 'مستخدم عادي' : 'Regular User'}</h3>
              <p className="text-sm text-muted-foreground mt-1">{isRTL ? 'أبحث عن مزودي خدمة وأقارن بينهم' : 'Looking for service providers'}</p>
            </button>
            <button onClick={() => { setAccountType('business'); setStep('details'); }}
              className="p-6 rounded-xl border-2 border-gold/30 bg-gold/5 hover:border-gold transition-all text-center group">
              <Building2 className="w-10 h-10 mx-auto mb-3 text-gold group-hover:scale-110 transition-transform" />
              <h3 className="font-heading font-bold text-lg">{isRTL ? 'منشأة / شركة' : 'Business / Entity'}</h3>
              <p className="text-sm text-muted-foreground mt-1">{isRTL ? 'مزوّد، مشتري، أو الاثنين' : 'Provider, buyer, or both'}</p>
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (step === 'details') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-heading font-bold text-2xl text-foreground">{isRTL ? 'أكمل بياناتك' : 'Complete your profile'}</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isRTL ? 'الاسم الكامل' : 'Full Name'} <span className="text-destructive">*</span></Label>
              <div className="relative">
                <User className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={isRTL ? 'أدخل اسمك الكامل' : 'Enter your full name'} style={{ paddingInlineStart: '40px' }} />
              </div>
            </div>
            <PhoneInput phone={phone} countryCode={countryCode} onPhoneChange={setPhone} onCountryCodeChange={setCountryCode} isRTL={isRTL} optional />
            <Button
              onClick={() => {
                if (!fullName.trim()) { toast.error(isRTL ? 'يرجى إدخال الاسم' : 'Please enter your name'); return; }
                if (phone && phone.length >= 7) setStep('phone-verify');
                else if (accountType === 'business') setStep('business-details');
                else completeOnboarding();
              }}
              disabled={!fullName.trim() || loading} className="w-full" variant="hero"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
              {isRTL ? 'متابعة' : 'Continue'}
            </Button>
          </div>
          <button onClick={() => setStep('account-type')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            {isRTL ? '→' : '←'} {isRTL ? 'رجوع' : 'Back'}
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (step === 'phone-verify') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-gold/10 flex items-center justify-center">
              <Phone className="w-8 h-8 text-gold" />
            </div>
            <h2 className="font-heading font-bold text-2xl text-foreground">{isRTL ? 'التحقق من رقم الجوال' : 'Verify Phone Number'}</h2>
            <p className="text-sm text-muted-foreground">
              {isRTL ? `سنرسل رمز تحقق إلى ${countryCode}${phone}` : `We'll send a verification code to ${countryCode}${phone}`}
            </p>
          </div>
          {!otp.otpStep ? (
            <div className="space-y-4">
              <Button onClick={handlePhoneSend} disabled={otp.loading} className="w-full" variant="hero">
                {otp.loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                {isRTL ? 'إرسال رمز التحقق' : 'Send Verification Code'}
              </Button>
              <Button onClick={handleSkipPhone} variant="ghost" className="w-full text-muted-foreground">
                {isRTL ? 'تخطي التحقق الآن' : 'Skip verification for now'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {otp.demoOtp && (
                <div className="p-3 rounded-lg bg-gold/10 border border-gold/20 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{isRTL ? 'رمز تجريبي (Twilio غير مربوط)' : 'Demo code (Twilio not connected)'}</p>
                  <p className="font-mono text-2xl font-bold text-gold tracking-widest">{otp.demoOtp}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>{isRTL ? 'رمز التحقق' : 'Verification Code'}</Label>
                <Input value={otp.otpCode} onChange={(e) => otp.setCode(e.target.value)} placeholder="000000" className="text-center text-2xl tracking-[0.5em] font-mono" dir="ltr" maxLength={6} />
              </div>
              <Button onClick={handlePhoneVerify} disabled={otp.loading || otp.otpCode.length !== 6} className="w-full" variant="hero">
                {otp.loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Check className="w-4 h-4 me-2" />}
                {isRTL ? 'تحقق' : 'Verify'}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button onClick={handlePhoneSend} disabled={otp.cooldown > 0 || otp.loading} className="text-gold hover:underline disabled:text-muted-foreground">
                  {otp.cooldown > 0 ? `${isRTL ? 'إعادة الإرسال بعد' : 'Resend in'} ${otp.cooldown}${isRTL ? ' ثانية' : 's'}` : (isRTL ? 'إعادة إرسال الرمز' : 'Resend code')}
                </button>
                <button onClick={handleSkipPhone} className="text-muted-foreground hover:text-foreground">{isRTL ? 'تخطي' : 'Skip'}</button>
              </div>
            </div>
          )}
          <button onClick={() => { setStep('details'); otp.resetOtp(); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            {isRTL ? '→' : '←'} {isRTL ? 'رجوع' : 'Back'}
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (step === 'business-details') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="font-heading font-bold text-2xl text-foreground text-center">
              {isRTL ? 'بيانات النشاط التجاري' : 'Business Details'}
            </h2>
            <Progress value={completionPct} className="h-1.5" />
            <p
              className="text-center text-xs text-muted-foreground tech-content"
              role="status"
              aria-live="polite"
            >
              {completionPct}% — {isRTL ? 'يمكنك الحفظ والمتابعة لاحقاً' : 'You can save and continue later'}
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isRTL ? 'اسم النشاط التجاري' : 'Business Name'} <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Building2 className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} dir="auto" style={{ paddingInlineStart: '40px' }} />
              </div>
            </div>
            <UsernamePicker
              isRTL={isRTL}
              required
              label={isRTL ? 'اسم المستخدم' : 'Username'}
              value={username}
              onChange={setUsername}
              onValidChange={(s) => setUsernameOk(s.isValid && s.isAvailable)}
              excludeUserId={user?.id ?? null}
              placeholder="my-business"
            />
            <div className="space-y-2">
              <Label>{isRTL ? 'وصف مختصر للنشاط' : 'Short business description'}</Label>
              <Textarea
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value.slice(0, 500))}
                placeholder={isRTL ? 'مثال: مصنع ألمنيوم متخصص في الواجهات والنوافذ' : 'e.g. Aluminum factory specializing in facades and windows'}
                rows={3}
                dir="auto"
              />
              <p className="text-[11px] text-muted-foreground tech-content text-end">{businessDescription.length}/500</p>
            </div>
            <Button onClick={() => {
              if (!businessName.trim()) { toast.error(isRTL ? 'يرجى إدخال اسم النشاط' : 'Please enter business name'); return; }
              if (!usernameOk) { toast.error(isRTL ? 'اختر اسم مستخدم صحيحاً ومتاحاً' : 'Pick a valid, available username'); return; }
              setStep('entity-type');
            }} disabled={!businessName.trim() || !usernameOk} className="w-full" variant="hero">
              {isRTL ? 'متابعة' : 'Continue'}
            </Button>
          </div>
          <button onClick={() => setStep(phone ? 'phone-verify' : 'details')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            {isRTL ? '→' : '←'} {isRTL ? 'رجوع' : 'Back'}
          </button>
        </div>
      </AuthLayout>
    );
  }

  // REGISTRATION-UX-FULL-COMPLETE-1 — entity type + identifiers + duplicate check
  if (step === 'entity-type') {
    const entityTypes: { id: EntityType; ar: string; en: string }[] = [
      { id: 'company', ar: 'شركة', en: 'Company' },
      { id: 'establishment', ar: 'مؤسسة', en: 'Establishment' },
      { id: 'individual_business', ar: 'عمل فردي', en: 'Individual business' },
      { id: 'private_entity', ar: 'كيان خاص', en: 'Private entity' },
      { id: 'service_provider', ar: 'مزوّد خدمة', en: 'Service provider' },
      { id: 'buyer_entity', ar: 'جهة مشتري / مستفيد', en: 'Buyer / beneficiary' },
      { id: 'other', ar: 'أخرى', en: 'Other' },
    ];
    const onContinue = async () => {
      setDuplicateChecking(true);
      try {
        const list = await findPossibleDuplicateEntities({
          name: businessName,
          cr: crNumber || null,
          vat: vatNumber || null,
        });
        setDuplicates(list);
        if (list.length > 0 && !duplicateAcknowledged) {
          const exact = list.some((d) => d.match_reason === 'cr' || d.match_reason === 'vat');
          if (exact) {
            toast.warning(isRTL
              ? 'قد تكون هذه المنشأة مسجلة مسبقًا. يمكنك طلب الانضمام بدل إنشاء منشأة مكررة.'
              : 'This entity may already exist. You can request access instead of creating a duplicate.');
            return;
          }
          // Fuzzy — allow continue with explicit acknowledgement
          setDuplicateAcknowledged(true);
          toast.warning(isRTL
            ? 'تم العثور على منشآت مشابهة. تأكّد أن منشأتك مختلفة قبل المتابعة.'
            : 'Similar entities found. Confirm your entity is different before continuing.');
          return;
        }
        setStep('entity-capabilities');
      } finally {
        setDuplicateChecking(false);
      }
    };
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="font-heading font-bold text-2xl text-foreground">
              {isRTL ? 'نوع المنشأة وبياناتها الرسمية' : 'Entity type & official details'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isRTL
                ? 'اختر نوع المنشأة وأدخل أرقامها الرسمية إن وجدت — يساعدنا ذلك على منع التكرار.'
                : 'Pick the entity type and add official numbers if any — this helps prevent duplicates.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">{isRTL ? 'نوع المنشأة' : 'Entity type'}</Label>
            <div className="grid grid-cols-2 gap-2">
              {entityTypes.map((t) => {
                const selected = entityType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    data-entity-type={t.id}
                    onClick={() => setEntityType(t.id)}
                    className={`p-3 rounded-lg border text-start text-sm transition-all ${selected ? 'border-gold bg-gold/10 text-foreground font-semibold' : 'border-border hover:border-gold/50 text-muted-foreground'}`}
                  >
                    {isRTL ? t.ar : t.en}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{isRTL ? 'الاسم التجاري (اختياري)' : 'Trade name (optional)'}</Label>
              <Input value={tradeName} onChange={(e) => setTradeName(e.target.value)} dir="auto" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{isRTL ? 'الموقع الإلكتروني' : 'Website'}</Label>
              <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{isRTL ? 'رقم السجل التجاري' : 'Commercial registration (CR)'}</Label>
              <Input value={crNumber} onChange={(e) => setCrNumber(e.target.value)} dir="ltr" className="tech-content" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{isRTL ? 'الرقم الضريبي / الموحد' : 'VAT / Unified number'}</Label>
              <Input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} dir="ltr" className="tech-content" />
            </div>
          </div>

          {duplicates.length > 0 && (
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 space-y-2" data-feature="duplicate-warning">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-warning" />
                {isRTL
                  ? 'قد تكون هذه المنشأة مسجلة مسبقًا. يمكنك طلب الانضمام بدل إنشاء منشأة مكررة.'
                  : 'This entity may already exist. You can request access instead of creating a duplicate.'}
              </p>
              <ul className="space-y-1">
                {duplicates.slice(0, 3).map((d) => (
                  <li key={d.id} className="text-[11px] text-muted-foreground flex items-center justify-between gap-2">
                    <span className="truncate">
                      <span className="tech-content me-1">{d.ref_id ?? d.legacy_ref_id ?? '—'}</span>
                      {isRTL ? (d.name_ar ?? d.name_en ?? '—') : (d.name_en ?? d.name_ar ?? '—')}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[11px]"
                      onClick={async () => {
                        if (!user) return;
                        const { data, error } = await createEntityAccessRequest({
                          requesterUserId: user.id,
                          targetBusinessId: d.id,
                          message: businessName,
                        });
                        if (!error && data?.ref_id) {
                          toast.success(isRTL ? `تم إرسال طلب الانضمام (${data.ref_id})` : `Access request sent (${data.ref_id})`);
                        } else {
                          toast.error(isRTL ? 'تعذّر إرسال الطلب' : 'Could not send the request');
                        }
                      }}
                    >
                      {isRTL ? 'طلب الانضمام' : 'Request access'}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <button onClick={() => setStep('business-details')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              {isRTL ? '→' : '←'} {isRTL ? 'رجوع' : 'Back'}
            </button>
            <Button onClick={onContinue} disabled={duplicateChecking} variant="hero" className="sm:w-64">
              {duplicateChecking ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
              {isRTL ? 'متابعة' : 'Continue'}
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (step === 'entity-capabilities') {
    const options: { id: CapabilityMode; ar: string; en: string; desc_ar: string; desc_en: string }[] = [
      { id: 'provider', ar: 'مقدم خدمة', en: 'Provider', desc_ar: 'أقدّم منتجات أو خدمات', desc_en: 'I provide products or services' },
      { id: 'buyer', ar: 'مستفيد / طالب خدمة', en: 'Buyer / beneficiary', desc_ar: 'أبحث عن منتجات أو خدمات وأطلب عروض أسعار', desc_en: 'I look for products/services and request quotes' },
      { id: 'both', ar: 'الاثنين', en: 'Both', desc_ar: 'أقدّم وأطلب في نفس الوقت', desc_en: 'I both provide and request' },
    ];
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="font-heading font-bold text-2xl text-foreground">
              {isRTL ? 'ماذا ستفعل منشأتك على قِطاعات؟' : 'What will your entity do on Qitaat?'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'يمكنك تعديل ذلك لاحقاً من إعدادات المنشأة.' : 'You can change this later from entity settings.'}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {options.map((o) => {
              const selected = capabilityMode === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  data-capability-mode={o.id}
                  onClick={() => setCapabilityMode(o.id)}
                  className={`p-3 rounded-lg border text-start transition-all ${selected ? 'border-gold bg-gold/10 text-foreground font-semibold' : 'border-border hover:border-gold/50 text-muted-foreground'}`}
                >
                  <div className="text-sm font-bold text-foreground">{isRTL ? o.ar : o.en}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{isRTL ? o.desc_ar : o.desc_en}</div>
                </button>
              );
            })}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <button onClick={() => setStep('entity-type')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              {isRTL ? '→' : '←'} {isRTL ? 'رجوع' : 'Back'}
            </button>
            <Button onClick={() => setStep('business-sectors')} variant="hero" className="sm:w-64">
              {isRTL ? 'متابعة' : 'Continue'}
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // REGISTRATION-UX-FULL-COMPLETE-1 Part 3 — Main location step
  if (step === 'main-location') {
    const canContinue = locationName.trim().length >= 2 && locationCity.trim().length >= 2 && locationAddress1.trim().length >= 2;
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="font-heading font-bold text-2xl text-foreground">
              {isRTL ? 'الموقع الرئيسي' : 'Main location'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isRTL
                ? 'أضف الموقع الرئيسي للمنشأة. يمكنك إضافة فروع ومواقع أخرى لاحقًا.'
                : "Add the entity's main location. You can add more branches and sites later."}
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{isRTL ? 'اسم الموقع' : 'Location name'} <span className="text-destructive">*</span></Label>
              <Input
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder={isRTL ? 'مثال: المقر الرئيسي - الرياض' : 'e.g. Head office — Riyadh'}
                dir="auto"
                data-field="location_name"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{isRTL ? 'نوع الموقع' : 'Location type'}</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" data-field="location_type">
                {LOCATION_TYPES.map((t) => {
                  const selected = locationType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      data-location-type={t.id}
                      onClick={() => setLocationType(t.id)}
                      className={`p-2 rounded-lg border text-sm transition-all ${selected ? 'border-gold bg-gold/10 text-foreground font-semibold' : 'border-border hover:border-gold/50 text-muted-foreground'}`}
                    >
                      {isRTL ? t.ar : t.en}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{isRTL ? 'المدينة' : 'City'} <span className="text-destructive">*</span></Label>
                <Input value={locationCity} onChange={(e) => setLocationCity(e.target.value)} dir="auto" data-field="city" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{isRTL ? 'الرمز البريدي (اختياري)' : 'Postal code (optional)'}</Label>
                <Input value={locationPostalCode} onChange={(e) => setLocationPostalCode(e.target.value)} dir="ltr" className="tech-content" data-field="postal_code" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{isRTL ? 'العنوان (السطر 1)' : 'Address line 1'} <span className="text-destructive">*</span></Label>
              <Input value={locationAddress1} onChange={(e) => setLocationAddress1(e.target.value)} dir="auto" data-field="address_line_1" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{isRTL ? 'العنوان (السطر 2) — اختياري' : 'Address line 2 (optional)'}</Label>
              <Input value={locationAddress2} onChange={(e) => setLocationAddress2(e.target.value)} dir="auto" data-field="address_line_2" />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <button onClick={() => setStep('business-sectors')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              {isRTL ? '→' : '←'} {isRTL ? 'رجوع' : 'Back'}
            </button>
            <Button
              onClick={() => setStep('staff-invite')}
              disabled={!canContinue}
              variant="hero"
              className="sm:w-64"
            >
              {isRTL ? 'متابعة' : 'Continue'}
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // REGISTRATION-UX-FULL-COMPLETE-1 Part 3 — Staff invite (skip-only shell)
  if (step === 'staff-invite') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="font-heading font-bold text-2xl text-foreground">
              {isRTL ? 'دعوة الموظفين' : 'Invite staff'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isRTL
                ? 'يمكنك دعوة الموظفين الآن أو لاحقًا من إعدادات المنشأة.'
                : 'You can invite staff now or later from entity settings.'}
            </p>
          </div>

          <div
            className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3"
            data-feature="staff-invite-shell"
          >
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <UserPlus className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <p>
                {isRTL
                  ? 'دعوة الموظفين ستكون متاحة من إعدادات المنشأة بعد اكتمال التسجيل.'
                  : 'Staff invitations will be available from entity settings after onboarding.'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 opacity-60" aria-hidden="true">
              {([
                { ar: 'مدير', en: 'Manager' },
                { ar: 'محرر', en: 'Editor' },
                { ar: 'مشاهد', en: 'Viewer' },
              ] as const).map((r) => (
                <div
                  key={r.en}
                  className="p-2 rounded-lg border border-border text-center text-[11px] text-muted-foreground"
                  data-role-preview={r.en.toLowerCase()}
                >
                  {isRTL ? r.ar : r.en}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <button onClick={() => setStep('main-location')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              {isRTL ? '→' : '←'} {isRTL ? 'رجوع' : 'Back'}
            </button>
            <Button
              onClick={completeOnboarding}
              disabled={loading}
              variant="hero"
              className="sm:w-64"
              data-action="skip-staff-invite"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
              {isRTL ? 'تخطي ومتابعة' : 'Skip and continue'}
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (step === 'summary') {
    // Required-fields readiness for the post-completion guidance line.
    const missing: { ar: string; en: string }[] = [];
    if (!businessDescription.trim()) missing.push({ ar: 'وصف النشاط', en: 'Description' });
    if (sectors.length === 0) missing.push({ ar: 'القطاعات', en: 'Sectors' });
    if (!phone) missing.push({ ar: 'رقم التواصل', en: 'Phone' });
    const readyToSubmit = completionPct >= 50 && missing.length === 0;
    const Arrow = isRTL ? ArrowLeft : ArrowRight;

    return (
      <AuthLayout>
        <div className="space-y-6" role="status" aria-live="polite">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h2 className="font-heading font-bold text-2xl text-foreground">
              {isRTL ? 'تم حفظ بيانات منشأتك' : 'Your business profile is saved'}
            </h2>
            {accountType === 'business' && (
              <div className="flex justify-center" data-feature="entity-verification-badge">
                <EntityVerificationStatusBadge
                  approvalStatus={createdEntityStatus?.approvalStatus ?? 'draft'}
                  isVerified={createdEntityStatus?.isVerified ?? false}
                />
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {isRTL
                ? 'يمكنك إكمال أي بيانات ناقصة من لوحة التحكم ثم إرسال الملف للمراجعة.'
                : 'You can complete any remaining fields from the dashboard, then submit your profile for review.'}
            </p>
          </div>

          {locationWarning && (
            <div
              className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning-foreground"
              role="status"
              data-feature="main-location-warning"
            >
              <AlertCircle className="w-3.5 h-3.5 inline-block me-1 text-warning" />
              {locationWarning}
            </div>
          )}

          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {isRTL ? 'نسبة الإكمال' : 'Completion'}
              </span>
              <span className="tech-content font-bold text-foreground">{completionPct}%</span>
            </div>
            <Progress value={completionPct} className="h-2" />

            {readyToSubmit ? (
              <p className="text-xs text-success flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isRTL
                  ? 'يمكنك الآن إرسال الملف للمراجعة من لوحة التحكم.'
                  : 'You can now submit your profile for review from the dashboard.'}
              </p>
            ) : missing.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'بيانات يُنصح بإكمالها لزيادة فرص الظهور:' : 'Fields to complete for better visibility:'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {missing.slice(0, 4).map((m) => (
                    <span key={m.en} className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2 py-0.5 text-[11px]">
                      <AlertCircle className="w-3 h-3 text-warning" />
                      {isRTL ? m.ar : m.en}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">
              {isRTL ? 'ماذا يحدث بعد ذلك؟' : "What happens next?"}
            </p>
            <ul className="space-y-1 list-disc list-inside">
              <li>{isRTL ? 'يبقى ملفك كمسودة حتى تُرسله للمراجعة.' : 'Your profile stays as a draft until you submit it.'}</li>
              <li>{isRTL ? 'بعد الإرسال يقوم الفريق بمراجعته خلال فترة قصيرة.' : 'After submission, our team reviews it shortly.'}</li>
              <li>{isRTL ? 'سيظهر ملفك للجمهور بعد الموافقة.' : 'Your profile becomes public after approval.'}</li>
            </ul>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard/settings')}
              className="text-sm"
            >
              {isRTL ? 'إكمال البيانات الآن' : 'Complete fields now'}
            </Button>
            <Button
              variant="hero"
              className="sm:w-72"
              onClick={() => navigate(readyToSubmit ? '/dashboard#provider-readiness' : '/dashboard')}
            >
              {readyToSubmit
                ? (isRTL ? 'الانتقال للمراجعة' : 'Go to review')
                : (isRTL ? 'الذهاب إلى لوحة التحكم' : 'Go to dashboard')}
              <Arrow className="w-4 h-4 ms-1" />
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // Final business step: sector picker + sub-services
  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="font-heading font-bold text-2xl text-foreground text-center">
            {isRTL ? 'القطاعات والخدمات' : 'Sectors & Services'}
          </h2>
          <Progress value={completionPct} className="h-1.5" />
          <p
            className="text-center text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {isRTL
              ? 'اختر القطاع/القطاعات والخدمات الفرعية التي يقدمها نشاطك'
              : 'Pick the sectors and sub-services your business operates in'}
          </p>
        </div>

        <SectorPicker
          selectedSectors={sectors}
          selectedSubServices={subServices}
          onSectorsChange={setSectors}
          onSubServicesChange={setSubServices}
          maxSectors={5}
        />

        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
          {isRTL
            ? 'لن يظهر ملفك للجمهور إلا بعد مراجعة الإدارة والموافقة. يمكنك الحفظ والعودة لاحقاً في أي وقت.'
            : 'Your profile will not be public until an admin reviews and approves it. You can save and continue later anytime.'}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={() => setStep('entity-capabilities')}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {isRTL ? '→ رجوع' : '← Back'}
          </button>
          <Button
            onClick={() => setStep('main-location')}
            disabled={sectors.length === 0}
            variant="hero"
            className="sm:w-64"
            aria-label={isRTL ? 'متابعة إلى الموقع الرئيسي' : 'Continue to main location'}
          >
            {isRTL ? 'متابعة' : 'Continue'}
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Onboarding;
