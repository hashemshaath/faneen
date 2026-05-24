import React, { useState, useMemo } from 'react';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { listOwnerBusinesses, listManagedStaffMembershipForUser } from '@/modules/businesses';
import {
  listActiveMembershipPlans,
  getCurrentMembershipSubscription,
  subscribeToPlan,
  cancelSubscriptionAtPeriodEnd,
  resumeSubscriptionRenewal,
  findPendingMembershipUpgradeRequest,
  insertMembershipUpgradeRequest,
  listMyPendingMembershipUpgradeRequests,
} from '@/modules/memberships';
import type { Tables } from '@/integrations/supabase/types';
import { sendTransactionalEmail } from '@/modules/notifications/services/sendTransactionalEmail';
import { createNotification } from '@/modules/notifications/services/createNotification';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Shield, Info, AlertTriangle, Check, Undo2, Building2, Send, Clock, ChevronDown, ChevronUp, MessageSquareWarning, X } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { MembershipHeader } from '@/components/membership/MembershipHeader';
import { CurrentSubscriptionCard } from '@/components/membership/CurrentSubscriptionCard';
import { MembershipPaymentStatus } from '@/components/membership/MembershipPaymentStatus';
import { MembershipPaymentHistory } from '@/components/membership/MembershipPaymentHistory';
import { PlanCard } from '@/components/membership/PlanCard';
import { FeatureComparisonTable } from '@/components/membership/FeatureComparisonTable';
import { PromoCodeRedeem } from '@/components/membership/PromoCodeRedeem';
import { RenewalStatusBanner } from '@/components/membership/RenewalStatusBanner';
import { MembershipKeysManager } from '@/components/membership/MembershipKeysManager';
import { MembershipBenefits } from '@/components/membership/MembershipBenefits';
import { MembershipFAQ } from '@/components/membership/MembershipFAQ';
import { MembershipTrustStrip } from '@/components/membership/MembershipTrustStrip';
import { track } from '@/lib/analytics-events';
import { Button } from '@/components/ui/button';
import { ensureDraftBusiness } from '@/lib/ensure-business';
import { logUpgradeRejection, rejectionReasonLabel, classifyRejectionReason } from '@/lib/membership-rejection-logger';

const tierOrder = ['free', 'basic', 'premium', 'enterprise'];

const Membership = () => {
  const { language, isRTL } = useLanguage();
  usePageMeta({
    title: language === 'ar'
      ? 'باقات العضوية الاحترافية — اشترك واحصل على مميزات حصرية | قِطاعات'
      : 'Professional Membership Plans — Grow Your Business | Qitaat',
    description: language === 'ar'
      ? 'اختر باقة قِطاعات المناسبة لمنشأتك الصناعية: ظهور أفضل، شارة موثّقة، تحليلات متقدمة، أدوات ذكاء اصطناعي، ودعم مخصص. ابدأ مجاناً وقم بالترقية في أي وقت.'
      : 'Choose the right Qitaat plan for your industrial business: better visibility, verified badge, advanced analytics, AI tools, and dedicated support. Start free and upgrade anytime.',
    keywords: language === 'ar'
      ? 'باقات العضوية, اشتراك قطاعات, دليل صناعي, ترقية المنشأة, شارة موثقة, تحليلات أعمال, السعودية'
      : 'membership plans, qitaat subscription, industrial directory, business upgrade, verified badge, business analytics, Saudi Arabia',
    ogType: 'website',
    canonical: 'https://qitaat.com/membership',
  });
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  const [pendingDowngrade, setPendingDowngrade] = useState<{ id: string; tier: string } | null>(null);
  const [pendingUpgrade, setPendingUpgrade] = useState<{ id: string; tier: string } | null>(null);
  const [showReviewNotes, setShowReviewNotes] = useState(false);

  // Per-ref_id dismissal of the auto-created draft banner. Persisted in
  // localStorage so a brand-new draft (different ref_id) shows the banner
  // again, while previously-acknowledged drafts stay hidden.
  const DRAFT_BANNER_KEY = 'qitaat_draft_banner_dismissed_v1';
  const [dismissedDraftRefs, setDismissedDraftRefs] = React.useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_BANNER_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
    } catch { return []; }
  });
  const dismissDraftBanner = (refId: string) => {
    setDismissedDraftRefs((prev) => {
      if (prev.includes(refId)) return prev;
      const next = [...prev, refId].slice(-50); // cap to last 50 refs
      try { localStorage.setItem(DRAFT_BANNER_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // Privacy-safe: tier of current user (or 'anonymous') — no PII.
  React.useEffect(() => {
    track.membershipPlanView({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const previousStatusRef = React.useRef<string | null>(null);

  const { data: plans = [] } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: async () => {
      const { data } = await listActiveMembershipPlans<Tables<'membership_plans'>>();
      return data ?? [];
    },
  });

  // Build structured data: BreadcrumbList + FAQPage + Service offers per plan
  const jsonLdBlocks = useMemo(() => {
    const baseUrl = 'https://qitaat.com';
    const pageUrl = `${baseUrl}/membership`;

    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: language === 'ar' ? 'الرئيسية' : 'Home', item: `${baseUrl}/` },
        { '@type': 'ListItem', position: 2, name: language === 'ar' ? 'باقات العضوية' : 'Membership Plans', item: pageUrl },
      ],
    };

    const faqPage = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: (language === 'ar' ? [
        { q: 'هل يمكنني تغيير باقتي لاحقاً؟', a: 'نعم، يمكنك ترقية باقتك في أي وقت. عند خفض الباقة تحتفظ بمميزاتك الحالية حتى انتهاء الفترة المدفوعة، ثم يتم الانتقال للباقة الأقل تلقائياً.' },
        { q: 'هل التجربة مجانية حقاً؟', a: 'الباقة المجانية مجانية بالكامل وبدون أي بطاقة ائتمان.' },
        { q: 'كيف يتم الدفع؟', a: 'حالياً النسخة تجريبية، ويتم تفعيل الترقيات يدوياً دون أي رسوم. سيتم إضافة الدفع الإلكتروني قريباً.' },
        { q: 'هل تشمل الأسعار ضريبة القيمة المضافة؟', a: 'نعم، جميع الأسعار شاملة لضريبة القيمة المضافة 15%.' },
        { q: 'هل يمكنني الحصول على فاتورة ضريبية؟', a: 'نعم، يتم إصدار فاتورة ضريبية إلكترونية معتمدة ويمكن تنزيلها من لوحة التحكم.' },
        { q: 'ماذا يحدث إذا ألغيت الاشتراك؟', a: 'تحتفظ بكامل مميزات باقتك حتى انتهاء فترة الاشتراك المدفوعة، ثم تنتقل تلقائياً للباقة المختارة أو المجانية.' },
      ] : [
        { q: 'Can I change my plan later?', a: 'Yes — upgrade anytime. When downgrading, you keep your benefits until the paid period ends, then move to the lower plan automatically.' },
        { q: 'Is the free tier really free?', a: 'The Free plan is fully free with no credit card required.' },
        { q: 'How does payment work?', a: 'We are in beta — upgrades are activated manually with no charge. Online payment is coming soon.' },
        { q: 'Do prices include VAT?', a: 'Yes — all displayed prices include 15% VAT per Saudi regulations.' },
        { q: 'Can I get a tax invoice?', a: 'Yes — a certified e-invoice is issued and can be downloaded from your dashboard.' },
        { q: 'What happens if I cancel?', a: 'You keep all benefits until the end of the paid period, then automatically move to your chosen plan or Free.' },
      ]).map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    };

    const offerCatalog = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: language === 'ar' ? 'باقات عضوية قِطاعات' : 'Qitaat Membership Plans',
      description: language === 'ar'
        ? 'باقات اشتراك للمنشآت الصناعية في قطاعات الألمنيوم والزجاج والأخشاب والحديد على منصة قِطاعات.'
        : 'Subscription plans for industrial businesses (Aluminum, Glass, Wood, Steel) on the Qitaat platform.',
      brand: { '@type': 'Brand', name: 'Qitaat' },
      url: pageUrl,
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'SAR',
        lowPrice: 0,
        highPrice: Math.max(0, ...plans.map((p) => Number((p as { price_yearly?: number }).price_yearly ?? 0))),
        offerCount: plans.length,
        offers: plans.map((p) => {
          const plan = p as { id: string; tier: string; name_ar?: string; name_en?: string; description_ar?: string; description_en?: string; price_monthly?: number; price_yearly?: number };
          return {
            '@type': 'Offer',
            sku: `qitaat-membership-${plan.tier}`,
            name: language === 'ar' ? plan.name_ar : plan.name_en,
            description: language === 'ar' ? plan.description_ar : plan.description_en,
            price: Number(plan.price_monthly ?? 0),
            priceCurrency: 'SAR',
            availability: 'https://schema.org/InStock',
            url: pageUrl,
            priceSpecification: [
              { '@type': 'UnitPriceSpecification', price: Number(plan.price_monthly ?? 0), priceCurrency: 'SAR', unitCode: 'MON', referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' } },
              { '@type': 'UnitPriceSpecification', price: Number(plan.price_yearly ?? 0), priceCurrency: 'SAR', unitCode: 'ANN', referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'ANN' } },
            ],
          };
        }),
      },
    };

    return [breadcrumb, faqPage, offerCatalog];
  }, [plans, language]);

  useMultiJsonLd(jsonLdBlocks);

  const { data: myBusiness } = useQuery({
    queryKey: ['my-business-membership', user?.id, profile?.account_type],
    queryFn: async () => {
      if (!user) return null;
      // 1. Owner: pick the most recently created business they own
      const owned = await listOwnerBusinesses<{ id: string; ref_id: string | null; membership_tier: string; name_ar: string | null; name_en: string | null; approval_status: string | null; onboarding_completion: number | null; approval_notes: string | null }>({
        userId: user.id,
        select: 'id, ref_id, membership_tier, name_ar, name_en, approval_status, onboarding_completion, approval_notes',
        orderBy: { column: 'created_at', ascending: false },
        limit: 1,
      });
      if (owned.data && owned.data.length > 0) return owned.data[0];

      // 2. Staff fallback: business they manage (owner/manager role)
      const staff = await listManagedStaffMembershipForUser({
        userId: user.id,
        select: 'business_id, role, businesses:business_id(id, ref_id, membership_tier, name_ar, name_en, approval_status, onboarding_completion, approval_notes)',
        limit: 1,
      });
      const row = staff.data?.[0] as { businesses?: { id: string; ref_id: string | null; membership_tier: string; name_ar: string | null; name_en: string | null; approval_status: string | null; onboarding_completion: number | null } } | undefined;
      if (row?.businesses) return row.businesses;

      // 3. Self-heal: business/company accounts must always have an entity.
      // Deduped via in-flight Promise + sessionStorage flag (one round-trip
      // per tab per user). Trigger `handle_new_user` already handles signups.
      const acct = profile?.account_type;
      if (acct === 'business' || acct === 'company') {
        const created = await ensureDraftBusiness(user.id, profile?.full_name ?? null, isRTL);
        if (created) return created;
      }
      return null;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Realtime + polling + toast: notify when business approval_status changes.
  const businessId = (myBusiness as { id?: string } | null | undefined)?.id ?? null;
  React.useEffect(() => {
    const current = (myBusiness as { approval_status?: string | null } | null | undefined)?.approval_status ?? null;
    const prev = previousStatusRef.current;
    if (prev && current && prev !== current) {
      const labelsAr: Record<string, string> = {
        draft: 'مسودة',
        submitted: 'تم الإرسال للمراجعة',
        under_review: 'قيد المراجعة',
        needs_changes: 'يحتاج إلى تعديلات',
        rejected: 'مرفوض',
        approved: 'تمت الموافقة',
      };
      const labelsEn: Record<string, string> = {
        draft: 'Draft',
        submitted: 'Submitted for review',
        under_review: 'Under review',
        needs_changes: 'Needs changes',
        rejected: 'Rejected',
        approved: 'Approved',
      };
      const label = (isRTL ? labelsAr : labelsEn)[current] ?? current;
      const title = isRTL ? 'تحديث حالة اعتماد المنشأة' : 'Business approval status updated';
      if (current === 'approved') toast.success(`${title}: ${label}`);
      else if (current === 'rejected' || current === 'needs_changes') toast.warning(`${title}: ${label}`);
      else toast.info(`${title}: ${label}`);
    }
    previousStatusRef.current = current;
  }, [myBusiness, isRTL]);

  React.useEffect(() => {
    if (!businessId) return;
    const channel = supabase
      .channel(`membership-business-${businessId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'businesses', filter: `id=eq.${businessId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['my-business-membership'] });
        },
      )
      .subscribe();
    const interval = window.setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['my-business-membership'] });
    }, 60_000);
    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(interval);
    };
  }, [businessId, queryClient]);

  const { data: mySubscription } = useQuery({
    queryKey: ['my-subscription', user?.id],
    queryFn: async () => {
      if (!user) return null;
      type MySub = Tables<'membership_subscriptions'> & {
        plan: Pick<Tables<'membership_plans'>, 'name_ar' | 'name_en' | 'tier'> | null;
      };
      const { data } = await getCurrentMembershipSubscription<MySub>({
        userId: user.id,
        select: '*, plan:membership_plans!plan_id(name_ar, name_en, tier)',
        statuses: ['active', 'past_due'],
      });
      return data;
    },
    enabled: !!user,
  });

  const subscribeMutation = useMutation({
    mutationFn: async (planId: string) => {
      if (!user || !myBusiness) throw new Error(isRTL ? 'يجب تسجيل الدخول وإنشاء نشاط تجاري أولاً' : 'Login and create a business first');
      const { data, error } = await subscribeToPlan({
        _user_id: user.id,
        _plan_id: planId,
        _business_id: myBusiness.id,
        _billing_cycle: billingCycle,
      });
      if (error) throw error;
      // subscribe_to_plan RETURNS uuid (new subscription id).
      return { subscriptionId: (data as unknown as string | null) ?? null, planId };
    },
    onSuccess: async (res) => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['my-business-membership'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSubscribingPlanId(null);
      toast.success(isRTL ? 'تم تفعيل الاشتراك بنجاح! 🎉' : 'Subscription activated! 🎉');
      const subId = res?.subscriptionId;
      if (!user?.email || !subId) return;
      const plan = plans.find((p) => p.id === res.planId);
      const tierName = plan ? (isRTL ? plan.name_ar : plan.name_en) || plan.tier : undefined;
      const businessName = myBusiness?.name_ar || myBusiness?.name_en || undefined;
      try {
        await sendTransactionalEmail({
          templateName: 'membership-subscription-activated',
          recipientEmail: user.email,
          idempotencyKey: `membership-activated-${subId}`,
          templateData: { recipientName: user.user_metadata?.full_name as string | undefined, businessName, tierName },
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[Membership] activated email failed', err);
      }
    },
    onError: (e: Error) => { setSubscribingPlanId(null); toast.error(e.message); },
  });

  // Manual upgrade request flow (paid plans). Replaces self-serve activation in beta.
  const requestUpgradeMutation = useMutation({
    mutationFn: async (plan: { id: string; tier: string }) => {
      if (!user || !myBusiness) throw new Error(isRTL ? 'يجب تسجيل الدخول وإنشاء نشاط تجاري أولاً' : 'Login and create a business first');
      const bizRefId = (myBusiness as { ref_id?: string | null }).ref_id ?? null;
      if (!bizRefId) {
        throw new Error(isRTL
          ? 'تعذّر التحقق من رقم المنشأة. يرجى تحديث الصفحة وإعادة المحاولة.'
          : 'Could not verify business reference. Please refresh and try again.');
      }
      // Prevent duplicate pending requests for same business+tier
      const { data: existing } = await findPendingMembershipUpgradeRequest<{ id: string }>({
        userId: user.id,
        businessId: myBusiness.id,
        requestedTier: plan.tier,
      });
      if (existing) return { duplicate: true };
      const { data: inserted, error } = await insertMembershipUpgradeRequest<{ id: string }>({
        user_id: user.id,
        business_id: myBusiness.id,
        business_ref_id: bizRefId,
        current_tier: currentTier,
        requested_tier: plan.tier,
        requested_plan_id: plan.id,
        billing_cycle: billingCycle,
        note: `Bound to business ${bizRefId}`,
      });
      if (error) throw error;
      return { duplicate: false, requestId: inserted?.id as string | undefined, tier: plan.tier };
    },
    onSuccess: async (res) => {
      setSubscribingPlanId(null);
      queryClient.invalidateQueries({ queryKey: ['my-upgrade-requests'] });
      if (res?.duplicate) {
        toast.info(isRTL ? 'لديك طلب ترقية معلّق لهذه الباقة بالفعل.' : 'You already have a pending request for this plan.');
        return;
      } else {
        toast.success(isRTL ? 'تم إرسال طلب الترقية، وسيتواصل معك فريق قطاعات قريباً.' : 'Upgrade request sent. Our team will contact you shortly.');
      }
      // Best-effort: in-app notification + confirmation email. Never blocks success.
      const requestId = res?.requestId;
      if (!requestId || !user) return;
      const businessName = myBusiness?.name_ar || myBusiness?.name_en || undefined;
      try {
        await createNotification({
          user_id: user.id,
          title_ar: 'تم استلام طلب ترقية الباقة',
          title_en: 'Upgrade request received',
          body_ar: 'سيقوم فريق قِطاعات بمراجعة طلبك والتواصل معك قريباً.',
          body_en: 'The Qitaat team will review your request and contact you shortly.',
          notification_type: 'system',
          reference_type: 'membership_upgrade_request',
          reference_id: requestId,
          action_url: '/membership',
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[Membership] notification insert failed', err);
      }
      if (user.email) {
        try {
          await sendTransactionalEmail({
            templateName: 'membership-upgrade-request-submitted',
            recipientEmail: user.email,
            idempotencyKey: `membership-upgrade-submitted-${requestId}`,
            templateData: { businessName, requestedTier: res?.tier },
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[Membership] upgrade-submitted email failed', err);
        }
      }
    },
    onError: (e: Error, plan: { id: string; tier: string }) => {
      setSubscribingPlanId(null);
      // Audit: log every blocked upgrade attempt where business_id / ref_id
      // mismatched (or other validation failures from the DB trigger).
      const bizRefId = (myBusiness as { ref_id?: string | null } | null | undefined)?.ref_id ?? null;
      const earlyReason = classifyRejectionReason(e.message || '');
      // For unknown/unrelated errors fall back to plain toast.
      if (!earlyReason) {
        toast.error(e.message);
        return;
      }
      const reasonText = rejectionReasonLabel(earlyReason, isRTL);
      // Show the localized reason immediately; enrich with audit id once the RPC returns.
      const toastId = toast.error(reasonText, {
        description: isRTL
          ? `${e.message}${bizRefId ? `\nالمنشأة: ${bizRefId}` : ''}`
          : `${e.message}${bizRefId ? `\nBusiness: ${bizRefId}` : ''}`,
        duration: 12_000,
        action: {
          label: isRTL ? 'تفاصيل الطلب' : 'Request details',
          onClick: () => navigate('/membership#upgrade-requests'),
        },
      });
      void logUpgradeRejection(supabase, {
        errorMessage: e.message || '',
        attemptedBusinessId: myBusiness?.id ?? null,
        attemptedBusinessRefId: bizRefId,
        requestedTier: plan?.tier ?? null,
        billingCycle,
      }).then((res) => {
        if (res.error) {
          // eslint-disable-next-line no-console
          console.warn('[Membership] failed to log upgrade rejection', res.error);
          return;
        }
        if (res.logged && res.auditId) {
          // Re-issue the same toast with the audit ID so the user can quote it
          // when contacting support, and admins can deep-link to the record.
          const shortId = res.auditId.slice(0, 8);
          toast.error(reasonText, {
            id: toastId,
            description: isRTL
              ? `${e.message}\nرقم السجل: ${shortId}…${bizRefId ? `  ·  المنشأة: ${bizRefId}` : ''}`
              : `${e.message}\nLog ID: ${shortId}…${bizRefId ? `  ·  Business: ${bizRefId}` : ''}`,
            duration: 14_000,
            action: {
              label: isRTL ? 'تفاصيل الطلب' : 'Request details',
              onClick: () => navigate(`/membership?rejection=${res.auditId}#upgrade-requests`),
            },
          });
        }
      });
    },
  });

  // Show pending upgrade requests for current user (status banner).
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['my-upgrade-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await listMyPendingMembershipUpgradeRequests({ userId: user.id });
      return data ?? [];
    },
    enabled: !!user,
  });

  const cancelMutation = useMutation({
    mutationFn: async (downgradeToPlanId: string | null) => {
      if (!mySubscription) throw new Error('No active subscription');
      const subId = mySubscription.id as string;
      const { error } = await cancelSubscriptionAtPeriodEnd({
        _subscription_id: subId,
        _downgrade_to_plan_id: downgradeToPlanId,
      });
      if (error) throw error;
      return { subId };
    },
    onSuccess: async (res) => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['my-business-membership'] });
      toast.success(isRTL
        ? 'تم إيقاف التجديد التلقائي. تحتفظ بمميزات باقتك حتى انتهاء الفترة الحالية.'
        : 'Auto-renewal cancelled. You keep your plan benefits until the current period ends.');
      const subId = res?.subId;
      if (!user || !subId) return;
      const businessName = myBusiness?.name_ar || myBusiness?.name_en || undefined;
      try {
        await createNotification({
          user_id: user.id,
          title_ar: 'تم إيقاف التجديد التلقائي',
          title_en: 'Auto-renewal cancelled',
          body_ar: 'تم إيقاف التجديد التلقائي. ستحتفظ بمميزات باقتك حتى انتهاء الفترة الحالية ثم تنتقل تلقائياً للباقة المجانية. يمكنك استئناف التجديد في أي وقت.',
          body_en: 'Auto-renewal is cancelled. You keep your plan benefits until the current period ends, then automatically move to Free. You can resume renewal anytime.',
          notification_type: 'system',
          reference_type: 'membership_subscription_cancelled',
          reference_id: subId,
          action_url: '/membership',
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[Membership] cancel notification failed', err);
      }
      if (user.email) {
        try {
          await sendTransactionalEmail({
            templateName: 'membership-subscription-cancelled',
            recipientEmail: user.email,
            idempotencyKey: `membership-cancelled-${subId}`,
            templateData: { businessName },
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[Membership] cancel email failed', err);
        }
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resumeRenewalMutation = useMutation({
    mutationFn: async () => {
      if (!mySubscription) throw new Error('No subscription');
      const subId = mySubscription.id as string;
      const { error } = await resumeSubscriptionRenewal({ _subscription_id: subId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
      toast.success(isRTL ? 'تم استئناف التجديد التلقائي' : 'Auto-renewal resumed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const currentTier = myBusiness?.membership_tier || 'free';
  const currentTierIndex = tierOrder.indexOf(currentTier);

  const handleSubscribe = (plan: { id: string; tier: string }) => {
    track.membershipPlanClick({ membership_tier: plan.tier });
    if (!user) { navigate('/auth'); return; }
    if (!myBusiness) {
      toast.info(isRTL ? 'جاري تحضير منشأتك...' : 'Preparing your business...');
      return;
    }
    const planTierIndex = tierOrder.indexOf(plan.tier);
    const isDowngradeAction = planTierIndex < currentTierIndex;
    // Free clicked while on a paid plan = downgrade-like; needs confirmation.
    if (isDowngradeAction) {
      setPendingDowngrade({ id: plan.id, tier: plan.tier });
      return;
    }
    if (plan.tier === 'free') {
      // Already on free, nothing to do.
      return;
    }
    // Paid upgrade — show inline confirmation showing the bound business
    // (ref_id + name) before sending the manual request to admins.
    setPendingUpgrade({ id: plan.id, tier: plan.tier });
    if (typeof window !== 'undefined') {
      // Scroll the confirmation card into view on mobile/long pages.
      requestAnimationFrame(() => {
        document.getElementById('upgrade-confirm-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  };

  const confirmDowngrade = () => {
    if (!pendingDowngrade) return;
    setSubscribingPlanId(pendingDowngrade.id);
    subscribeMutation.mutate(pendingDowngrade.id);
    setPendingDowngrade(null);
  };

  const confirmUpgrade = () => {
    if (!pendingUpgrade) return;
    setSubscribingPlanId(pendingUpgrade.id);
    requestUpgradeMutation.mutate(pendingUpgrade);
    setPendingUpgrade(null);
  };

  const daysRemaining = useMemo(() => {
    if (!mySubscription?.expires_at) return null;
    const diff = new Date(mySubscription.expires_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  }, [mySubscription]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container px-4 py-10 sm:py-16">
        <MembershipHeader isRTL={isRTL} billingCycle={billingCycle} setBillingCycle={setBillingCycle} plans={plans} />

        <div className="max-w-3xl mx-auto mb-6 rounded-xl border border-info/30 bg-info/5 px-4 py-3 flex items-start gap-2 text-xs text-foreground/80">
          <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {isRTL
              ? 'نسخة تجريبية — يتم تفعيل الترقيات يدوياً حالياً دون أي رسوم. سيتم إضافة الدفع الإلكتروني لاحقاً.'
              : 'Beta — upgrades are manually activated for now with no charge. Online payment will be added later.'}
          </p>
        </div>

        {user && myBusiness && (() => {
          const biz = myBusiness as {
            ref_id?: string | null;
            name_ar?: string | null;
            name_en?: string | null;
            approval_status?: string | null;
            onboarding_completion?: number | null;
            approval_notes?: string | null;
          };
          const status = biz.approval_status ?? 'draft';
          const completion = biz.onboarding_completion ?? 0;
          const isComplete = status === 'approved' && completion >= 80;
          const isReview = status === 'submitted' || status === 'under_review';
          const needsChanges = status === 'needs_changes' || status === 'rejected';
          const isDraft = !isComplete && !isReview && !needsChanges;
          const isAutoCreatedDraft = isDraft && completion === 0;
          const draftDismissed = !!biz.ref_id && dismissedDraftRefs.includes(biz.ref_id);

          const tone = isComplete
            ? 'border-success/30 bg-success/5 text-success'
            : isReview
              ? 'border-info/30 bg-info/5 text-info'
              : needsChanges
                ? 'border-destructive/30 bg-destructive/5 text-destructive'
                : 'border-warning/30 bg-warning/5 text-warning';

          const label = isComplete
            ? (isRTL ? 'مكتملة ومعتمدة' : 'Complete & approved')
            : isReview
              ? (isRTL ? 'تحت المراجعة' : 'Under review')
              : needsChanges
                ? (isRTL ? 'تحتاج تعديلات' : 'Needs changes')
                : (isRTL ? 'مسودة — أكمل بياناتك' : 'Draft — complete your profile');

          return (
            <>
              {isAutoCreatedDraft && !draftDismissed && (
                <div className="max-w-3xl mx-auto mb-3 rounded-xl border border-info/30 bg-info/5 px-4 py-3 flex items-start gap-3">
                  <Info className="w-5 h-5 text-info shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-relaxed">
                      {isRTL
                        ? 'تم إنشاء منشأتك تلقائياً كمسودة برقم تسلسلي خاص. أكمل بياناتها لتفعيل اعتمادها وعرضها في الدليل.'
                        : 'Your business was auto-created as a draft with its own reference ID. Complete its details to activate approval and listing.'}
                    </p>
                    {biz.ref_id && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="me-1">{isRTL ? 'الرقم التسلسلي:' : 'Reference ID:'}</span>
                        <span className="tech-content font-mono font-semibold text-foreground">{biz.ref_id}</span>
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Link to="/dashboard/business-draft">
                        <Button size="sm" className="h-8 text-xs gap-1.5">
                          <Building2 className="w-3.5 h-3.5" />
                          {isRTL ? 'إدارة المنشأة' : 'Manage business'}
                        </Button>
                      </Link>
                      <Link to="/onboarding">
                        <Button size="sm" variant="outline" className="h-8 text-xs">
                          {isRTL ? 'استئناف الإعداد' : 'Resume setup'}
                        </Button>
                      </Link>
                    </div>
                  </div>
                  {biz.ref_id && (
                    <button
                      type="button"
                      onClick={() => dismissDraftBanner(biz.ref_id!)}
                      className="shrink-0 -m-1 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                      aria-label={isRTL ? 'إخفاء التنبيه' : 'Dismiss notice'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
              <div className={`max-w-3xl mx-auto mb-6 rounded-xl border ${tone.split(' ').slice(0, 2).join(' ')} px-4 py-3 flex items-center gap-3`}>
              <Building2 className={`w-5 h-5 shrink-0 ${tone.split(' ')[2]}`} />
              <div className="flex-1 min-w-0 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {biz.name_ar || biz.name_en || (isRTL ? 'منشأتك' : 'Your business')}
                  </span>
                  {biz.ref_id && (
                    <span className="tech-content text-xs font-mono px-2 py-0.5 rounded bg-accent/10 text-accent">
                      {biz.ref_id}
                    </span>
                  )}
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tone.split(' ').slice(0, 2).join(' ')} ${tone.split(' ')[2]}`}>
                    {label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isComplete
                    ? (isRTL ? 'سيتم تطبيق الترقية على هذه المنشأة مباشرة.' : 'Upgrade will apply to this business directly.')
                    : isReview
                      ? (isRTL ? 'يمكنك الاشتراك الآن، وسيكتمل الاعتماد خلال المراجعة.' : 'You can subscribe now; approval will finalize during review.')
                      : needsChanges
                        ? (isRTL ? 'الرجاء معالجة الملاحظات لاكتمال اعتماد المنشأة.' : 'Please address the notes to finalize your business.')
                        : (isRTL ? 'الترقية مرتبطة بهذه المنشأة. أكمل بياناتها لرفع جاهزيتها.' : 'Upgrade is bound to this business. Complete its profile to boost readiness.')}
                </p>
              </div>
              <div className="shrink-0 flex flex-wrap items-center gap-2">
                {needsChanges && biz.approval_notes && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5"
                    aria-expanded={showReviewNotes}
                    aria-controls="review-notes-panel"
                    onClick={() => setShowReviewNotes((v) => !v)}
                  >
                    <MessageSquareWarning className="w-3.5 h-3.5" />
                    {showReviewNotes
                      ? (isRTL ? 'إخفاء الملاحظات' : 'Hide notes')
                      : (isRTL ? 'عرض ملاحظات المراجعة' : 'Show review notes')}
                    {showReviewNotes
                      ? <ChevronUp className="w-3.5 h-3.5" />
                      : <ChevronDown className="w-3.5 h-3.5" />}
                  </Button>
                )}
                {!isComplete && (
                  <Link to="/onboarding">
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                      {isRTL ? 'إكمال البيانات' : 'Complete profile'}
                    </Button>
                  </Link>
                )}
              </div>
              </div>
              {needsChanges && biz.approval_notes && showReviewNotes && (
                <div
                  id="review-notes-panel"
                  className="max-w-3xl mx-auto -mt-4 mb-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3"
                  role="region"
                  aria-label={isRTL ? 'ملاحظات المراجعة' : 'Review notes'}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquareWarning className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground mb-1">
                        {isRTL ? 'ملاحظات فريق المراجعة' : 'Reviewer notes'}
                      </p>
                      <p className="text-xs text-foreground/85 leading-relaxed whitespace-pre-wrap" dir="auto">
                        {biz.approval_notes}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {pendingRequests.length > 0 && (
          <div className="max-w-3xl mx-auto mb-6 rounded-xl border border-info/30 bg-info/5 px-4 py-3 flex items-start gap-2 text-xs text-foreground/80">
            <Clock className="w-4 h-4 text-info shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {isRTL
                ? `لديك ${pendingRequests.length} طلب ترقية قيد المراجعة من فريق قطاعات.`
                : `You have ${pendingRequests.length} upgrade request(s) being reviewed by the Qitaat team.`}
            </p>
          </div>
        )}

        {user && mySubscription && (
          <RenewalStatusBanner
            isRTL={isRTL}
            status={(mySubscription as { status?: string }).status ?? ''}
            graceUntil={(mySubscription as { grace_period_until?: string | null }).grace_period_until ?? null}
            expiresAt={(mySubscription as { expires_at?: string | null }).expires_at ?? null}
            onRenew={() => {
              const planId = (mySubscription as { plan_id?: string }).plan_id;
              const tier = (mySubscription as { plan?: { tier?: string } }).plan?.tier;
              if (planId && tier) {
                setSubscribingPlanId(planId);
                requestUpgradeMutation.mutate({ id: planId, tier });
              }
            }}
            isRenewing={requestUpgradeMutation.isPending}
          />
        )}

        {user && <PromoCodeRedeem isRTL={isRTL} businessId={myBusiness?.id ?? null} />}

        {pendingUpgrade && myBusiness && (() => {
          const biz = myBusiness as { id: string; ref_id?: string | null; name_ar?: string | null; name_en?: string | null };
          const bizName = (isRTL ? biz.name_ar : biz.name_en) || biz.name_ar || biz.name_en || (isRTL ? 'منشأتك' : 'Your business');
          const planLabel = pendingUpgrade.tier.charAt(0).toUpperCase() + pendingUpgrade.tier.slice(1);
          return (
            <div
              id="upgrade-confirm-card"
              className="max-w-3xl mx-auto mb-6 rounded-xl border border-primary/30 bg-primary/5 px-4 py-4"
              role="region"
              aria-label={isRTL ? 'تأكيد طلب الترقية' : 'Confirm upgrade request'}
            >
              <div className="flex items-start gap-2 mb-3">
                <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {isRTL ? 'تأكيد طلب الترقية' : 'Confirm upgrade request'}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isRTL
                      ? 'سيتم ربط الترقية بالمنشأة المعروضة أدناه فقط. يُرجى مراجعة البيانات قبل الإرسال.'
                      : 'The upgrade will be bound to the business shown below only. Please review before sending.'}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 mb-3 space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground truncate" dir="auto">{bizName}</span>
                </div>
                {biz.ref_id && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{isRTL ? 'الرقم المرجعي:' : 'Reference:'}</span>
                    <span className="tech-content font-mono font-semibold text-foreground">{biz.ref_id}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{isRTL ? 'الباقة المطلوبة:' : 'Requested plan:'}</span>
                  <span className="font-semibold text-foreground capitalize">{planLabel}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{billingCycle === 'yearly' ? (isRTL ? 'سنوي' : 'Yearly') : (isRTL ? 'شهري' : 'Monthly')}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={confirmUpgrade}
                  disabled={requestUpgradeMutation.isPending || !biz.ref_id}
                >
                  <Send className="w-3.5 h-3.5" />
                  {isRTL ? 'تأكيد وإرسال الطلب' : 'Confirm & send request'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => { setPendingUpgrade(null); setSubscribingPlanId(null); }}
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            </div>
          );
        })()}
        {pendingDowngrade && (
          <div className="max-w-3xl mx-auto mb-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="text-sm text-foreground leading-relaxed mb-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              {pendingDowngrade.tier === 'free'
                ? (isRTL
                    ? 'سيؤدي الانتقال للباقة المجانية إلى تقليل المزايا والحدود المتاحة.'
                    : 'Switching to the Free plan will reduce your benefits and limits.')
                : (isRTL
                    ? 'سيؤدي خفض الباقة إلى تقليل بعض المزايا والحدود المتاحة.'
                    : 'Downgrading will reduce some of your benefits and limits.')}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" className="h-8 text-xs gap-1.5" onClick={confirmDowngrade} disabled={subscribeMutation.isPending}>
                <Check className="w-3.5 h-3.5" />
                {isRTL ? 'تأكيد خفض الباقة' : 'Confirm downgrade'}
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setPendingDowngrade(null)}>
                <Undo2 className="w-3.5 h-3.5" />
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </div>
        )}

        {user && mySubscription && (
          <CurrentSubscriptionCard
            isRTL={isRTL}
            currentTier={currentTier}
            mySubscription={mySubscription}
            daysRemaining={daysRemaining}
            cancelMutation={cancelMutation}
            resumeMutation={resumeRenewalMutation}
            downgradeOptions={plans.map((p) => ({
              id: p.id as string,
              tier: p.tier as string,
              name_ar: (p.name_ar as string) ?? '',
              name_en: (p.name_en as string) ?? '',
            }))}
          />
        )}

        {user && mySubscription && (
          <MembershipPaymentStatus
            isRTL={isRTL}
            subscriptionId={(mySubscription as { id?: string }).id ?? null}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const planTierIndex = tierOrder.indexOf(plan.tier);
            const isCurrentPlan = !!(currentTier === plan.tier && mySubscription);
            const isUpgrade = planTierIndex > currentTierIndex;
            const isDowngrade = planTierIndex < currentTierIndex && planTierIndex > 0;

            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                billingCycle={billingCycle}
                isRTL={isRTL}
                language={language}
                isCurrentPlan={isCurrentPlan}
                isUpgrade={isUpgrade}
                isDowngrade={isDowngrade}
                isSubscribing={subscribingPlanId === plan.id}
                onSubscribe={handleSubscribe}
              />
            );
          })}
        </div>

        <FeatureComparisonTable isRTL={isRTL} />

        <MembershipBenefits isRTL={isRTL} />

        <MembershipTrustStrip isRTL={isRTL} />

        <MembershipFAQ isRTL={isRTL} />

        {user && myBusiness?.id && (
          <MembershipKeysManager isRTL={isRTL} businessId={myBusiness.id} />
        )}

        <div className="max-w-3xl mx-auto mt-16 sm:mt-20 text-center rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 via-card to-primary/5 p-8 sm:p-10">
          <h3 className="font-heading font-bold text-xl sm:text-2xl text-foreground mb-2">
            {isRTL ? 'جاهز للارتقاء بأعمالك؟' : 'Ready to grow your business?'}
          </h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
            {isRTL
              ? 'انضم لمئات المنشآت التي تثق بقطاعات لتنمية أعمالها في القطاع الصناعي.'
              : 'Join hundreds of businesses that trust Qitaat to grow in the industrial sector.'}
          </p>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            {isRTL ? 'جميع الخطط تشمل حماية كاملة للبيانات والخصوصية' : 'All plans include full data protection and privacy'}
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Membership;
