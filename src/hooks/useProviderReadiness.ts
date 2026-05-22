import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOwnerBusiness } from '@/modules/businesses';

type ReadinessBusiness = {
  id: string;
  name_ar: string | null;
  username: string | null;
  logo_url: string | null;
  description_ar: string | null;
  short_description_ar: string | null;
  category_id: string | null;
  city_id: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  approval_status: ApprovalStatus | null;
  approval_notes: string | null;
  onboarding_completion: number | null;
  username_status: string | null;
  is_active: boolean | null;
};

export type ApprovalStatus =
  | 'draft' | 'submitted' | 'under_review'
  | 'approved' | 'rejected' | 'needs_changes' | 'published';

export type MissingField = { key: string; ar: string; en: string; href: string };

/**
 * Single source of truth for provider profile readiness:
 * fetches the user's primary business, derives completion %, status,
 * and a list of missing fields. Shared by the dashboard hero summary
 * (P3) and the lower ProviderReadinessCard.
 */
export function useProviderReadiness(userId: string | undefined) {
  const query = useQuery({
    queryKey: ['provider-readiness', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await getOwnerBusiness<ReadinessBusiness>({
        userId: userId!,
        select:
          'id, name_ar, username, logo_url, description_ar, short_description_ar, category_id, city_id, phone, mobile, email, address, approval_status, approval_notes, onboarding_completion, username_status, is_active',
        orderBy: { column: 'created_at', ascending: true },
        limit: 1,
      });
      return data;
    },
  });

  const business = query.data;

  const missing = useMemo<MissingField[]>(() => {
    if (!business) return [];
    const items: MissingField[] = [];
    if (!business.logo_url)
      items.push({ key: 'logo', ar: 'الشعار', en: 'Logo', href: '/dashboard/settings' });
    if (!(business.description_ar || business.short_description_ar))
      items.push({ key: 'desc', ar: 'وصف النشاط', en: 'Description', href: '/dashboard/settings' });
    if (!business.category_id)
      items.push({ key: 'category', ar: 'القطاع', en: 'Sector', href: '/dashboard/settings' });
    if (!business.city_id)
      items.push({ key: 'city', ar: 'المدينة', en: 'City', href: '/dashboard/settings' });
    if (!(business.phone || business.mobile))
      items.push({ key: 'phone', ar: 'رقم التواصل', en: 'Phone', href: '/dashboard/settings' });
    if (!business.email)
      items.push({ key: 'email', ar: 'البريد الإلكتروني', en: 'Email', href: '/dashboard/settings' });
    if (!business.address)
      items.push({ key: 'address', ar: 'العنوان', en: 'Address' , href: '/dashboard/settings' });
    return items;
  }, [business]);

  const status = (business?.approval_status ?? 'draft') as ApprovalStatus;
  const completion = business?.onboarding_completion ?? 0;
  const isPublic = status === 'approved' || status === 'published';
  const needsAttention = status === 'rejected' || status === 'needs_changes';
  const canSubmit = status === 'draft' || status === 'needs_changes' || status === 'rejected';

  return {
    business,
    isLoading: query.isLoading,
    missing,
    status,
    completion,
    isPublic,
    needsAttention,
    canSubmit,
  };
}