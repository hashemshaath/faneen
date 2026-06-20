import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import { pickBi } from '@/components/common/Bilingual';
import { toE164 } from '@/components/forms/PhoneField';
import { SA_REGIONS } from '@/data/sa-regions';
import {
  adminCreateBusinessWithOwner,
  type AdminCreateBusinessPayload,
} from '@/modules/businesses/services/adminCreateBusinessWithOwner';
import { mapAdminCreateBizError } from '@/modules/businesses/services/adminCreateBusinessWithOwnerErrors';
import {
  insertBusiness,
  BUSINESS_SAFE_COLUMNS_SELECT,
} from '@/modules/businesses';
import type { AdminCreateBusinessFormState } from '@/pages/admin/adminBusinesses.types';
import { emptyCreateBusinessForm } from '@/components/admin/businesses/create/createFormDefaults';

export interface AdminCreateBusinessMutationDeps {
  getForm: () => AdminCreateBusinessFormState;
  setForm: React.Dispatch<React.SetStateAction<AdminCreateBusinessFormState>>;
  setCreating: React.Dispatch<React.SetStateAction<boolean>>;
  isRTL: boolean;
  logAction: (action: string, entityId: string, details: Record<string, unknown>) => Promise<void>;
  openEdit: (row: Record<string, unknown>) => void;
  queryClient: QueryClient;
}

export function buildAdminCreateBusinessMutationOptions(
  deps: AdminCreateBusinessMutationDeps,
): UseMutationOptions<Record<string, unknown>, unknown, void> {
  const { getForm, setForm, setCreating, isRTL, logAction, openEdit, queryClient } = deps;
  return {
    mutationFn: async () => {
      const createForm = getForm();
      if (!createForm.username || !createForm.username_ok) {
        throw new Error(pickBi(isRTL, 'اسم المستخدم غير صالح أو محجوز', 'Username is invalid or taken'));
      }
      if (!createForm.name_ar?.trim()) {
        throw new Error(pickBi(isRTL, 'الاسم بالعربية مطلوب', 'Arabic name is required'));
      }
      const phoneE164 = createForm.phone_national
        ? toE164({ countryCode: createForm.phone_cc || '+966', national: createForm.phone_national })
        : null;
      const region = SA_REGIONS.find((r) => r.id === createForm.region_id);
      const ownerMode = (createForm.owner_mode || 'placeholder') as 'placeholder' | 'existing' | 'new' | 'invite';

      const bizCore: AdminCreateBusinessPayload = {
        username: createForm.username.trim().toLowerCase(),
        name_ar: createForm.name_ar.trim(),
        name_en: createForm.name_en?.trim() || null,
        phone: phoneE164 || null,
        email: createForm.email?.trim() || null,
        city_id: createForm.city_id || null,
        region: region ? region.name_ar : null,
        region_en: region ? region.name_en : null,
        national_id: createForm.national_id?.trim() || null,
        unified_number: createForm.unified_number?.trim() || null,
        vat_number: createForm.vat_number?.trim() || null,
        district: createForm.district?.trim() || null,
        district_en: createForm.district_en?.trim() || null,
        street_name: createForm.street_name?.trim() || null,
        street_name_en: createForm.street_name_en?.trim() || null,
        building_number: createForm.building_number?.trim() || null,
        additional_number: createForm.additional_number?.trim() || null,
        address: createForm.address?.trim() || null,
        address_en: createForm.address_en?.trim() || null,
      };

      if (ownerMode === 'placeholder' || ownerMode === 'new' || ownerMode === 'invite') {
        if (ownerMode !== 'placeholder') {
          const email = (createForm.owner_email || '').trim().toLowerCase();
          if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error(pickBi(isRTL, 'بريد المسؤول غير صالح', 'Invalid manager email'));
          }
          if (ownerMode === 'new' && (createForm.owner_password || '').length < 8) {
            throw new Error(pickBi(isRTL, 'كلمة المرور يجب ألا تقل عن 8 أحرف', 'Password must be at least 8 characters'));
          }
        }
        const ownerEmail = ownerMode === 'placeholder'
          ? undefined
          : (createForm.owner_email || '').trim().toLowerCase();
        const res = await adminCreateBusinessWithOwner({
          owner: {
            mode: ownerMode,
            email: ownerEmail,
            password: ownerMode === 'new' ? createForm.owner_password : undefined,
            full_name: (createForm.owner_full_name || createForm.name_ar || '').trim(),
            phone: (createForm.owner_phone || '').trim() || undefined,
            position: (createForm.owner_position || '').trim() || undefined,
            auto_confirm: true,
          },
          business: bizCore,
          redirect_to: `${window.location.origin}/auth/reset-password`,
        });
        if (!res.success || !res.business) {
          throw new Error(res.error || (pickBi(isRTL, 'فشل الإنشاء', 'Create failed')));
        }
        return res.business as unknown as Record<string, unknown>;
      }

      const ownerId = createForm.resolved_user_id;
      if (!ownerId) {
        throw new Error('owner_id_or_ref_required');
      }
      const payload: Record<string, unknown> = {
        ...bizCore,
        user_id: ownerId,
        approval_status: 'draft',
        is_active: false,
        is_demo: false,
      };
      const { data, error } = await insertBusiness({
        payload,
        select: BUSINESS_SAFE_COLUMNS_SELECT,
        terminal: 'single',
      });
      if (error) throw error;
      await logAction('business_created', (data as { id?: string } | null)?.id ?? '', { username: payload.username });
      return data as Record<string, unknown>;
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      const mode = getForm().owner_mode;
      toast.success(
        isRTL
          ? mode === 'placeholder'
            ? 'تم إنشاء المنشأة تحت الحساب المؤقت — قابلة للتحويل لاحقاً'
            : mode === 'invite'
            ? 'تم إنشاء المنشأة وإرسال دعوة للمسؤول'
            : mode === 'new'
            ? 'تم إنشاء المنشأة وحساب المسؤول'
            : 'تم إنشاء المنشأة كمسودة — استخدم زر نشر الجهة لإظهارها للعامة'
          : mode === 'placeholder'
          ? 'Entity created under the placeholder account — transferable later'
          : mode === 'invite'
          ? 'Business created — invitation sent to manager'
          : mode === 'new'
          ? 'Business and manager account created'
          : 'Business created as a draft — use Publish business to make it public',
      );
      setCreating(false);
      setForm(emptyCreateBusinessForm());
      if (row) openEdit(row);
    },
    onError: (err: unknown) => {
      const raw = err instanceof Error ? err.message : '';
      const msg = mapAdminCreateBizError(raw, pickBi(isRTL, 'ar', 'en'));
      const isInvalidMode = raw.includes('invalid_owner_mode');
      toast.error(
        pickBi(isRTL, 'فشل إنشاء المنشأة', 'Failed to create business'),
        {
          description: msg,
          ...(isInvalidMode
            ? {
                action: {
                  label: pickBi(isRTL, 'تحويل إلى "بدون مدير"', 'Switch to "No manager"'),
                  onClick: () => {
                    setForm((f) => ({ ...f, owner_mode: 'placeholder' }));
                  },
                },
                duration: 10000,
              }
            : {}),
        },
      );
    },
  };
}