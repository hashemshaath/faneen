import { useState, useMemo, useCallback, useTransition, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { getOwnerBusiness } from '@/modules/businesses';
import { listActiveCities } from '@/modules/locations';
import { NationalAddressForm, type NationalAddressValue } from '@/modules/addresses';
import { buildAddressLine } from '@/modules/addresses/helpers/buildAddressLine';
import { LocationPicker } from '@/components/dashboard/business-edit/LocationPicker';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BarcodeWidget from '@/components/barcodes/BarcodeWidget';
import { useEntityBarcode } from '@/lib/barcodes/useEntityBarcode';
import { toast } from 'sonner';
import {
  MapPin, Plus, Pencil, Trash2, Search, X, Loader2, Building2, Home, Warehouse,
  Store, Briefcase, Layers, AlertCircle, CheckCircle2, FileText, Phone, User,
  ExternalLink, Star, ArrowUpRight, Map as MapIcon, FilePlus2, QrCode, ScrollText,
  Landmark, SlidersHorizontal, Printer, Info, HelpCircle, ChevronRight,
} from 'lucide-react';

type SiteType = 'apartment' | 'villa' | 'showroom' | 'office' | 'branch' | 'warehouse' | 'project' | 'commercial' | 'other';
type Visibility = 'private' | 'shared_by_qr' | 'provider_invited' | 'public_limited';

interface ClientSite {
  id: string;
  site_ref: string | null;
  business_id: string;
  client_user_id: string | null;
  owner_user_id: string | null;
  label: string;
  site_name: string | null;
  site_type: SiteType;
  visibility: Visibility;
  contact_name: string | null;
  contact_phone: string | null;
  city_id: string | null;
  city_name: string | null;
  district: string | null;
  district_en: string | null;
  region: string | null;
  region_en: string | null;
  street_name: string | null;
  street_name_en: string | null;
  building_number: string | null;
  additional_number: string | null;
  post_code: string | null;
  short_address: string | null;
  address_en: string | null;
  address_line1: string;
  address_line2: string | null;
  map_url: string | null;
  latitude: number | null;
  longitude: number | null;
  access_notes: string | null;
  is_default: boolean;
  archived_at: string | null;
  created_at: string;
  /* Government / legal */
  municipal_license_no: string | null;
  municipal_license_issue_date: string | null;
  municipal_license_expiry_date: string | null;
  title_deed_no: string | null;
  title_deed_date: string | null;
  owner_name: string | null;
  owner_id_number: string | null;
  land_use_type: string | null;
  plot_number: string | null;
  block_number: string | null;
  plan_number: string | null;
  government_notes: string | null;
}

const SITE_TYPES: { value: SiteType; ar: string; en: string; icon: typeof Home }[] = [
  { value: 'villa',      ar: 'فيلا',     en: 'Villa',      icon: Home },
  { value: 'apartment',  ar: 'شقة',      en: 'Apartment',  icon: Building2 },
  { value: 'office',     ar: 'مكتب',     en: 'Office',     icon: Briefcase },
  { value: 'showroom',   ar: 'صالة عرض', en: 'Showroom',   icon: Store },
  { value: 'branch',     ar: 'فرع',      en: 'Branch',     icon: Building2 },
  { value: 'warehouse',  ar: 'مستودع',   en: 'Warehouse',  icon: Warehouse },
  { value: 'project',    ar: 'مشروع',    en: 'Project',    icon: Layers },
  { value: 'commercial', ar: 'تجاري',    en: 'Commercial', icon: Store },
  { value: 'other',      ar: 'أخرى',     en: 'Other',      icon: MapPin },
];

const VISIBILITY: { value: Visibility; ar: string; en: string }[] = [
  { value: 'private',          ar: 'خاص',                en: 'Private' },
  { value: 'shared_by_qr',     ar: 'مشاركة عبر QR',      en: 'Shared by QR' },
  { value: 'provider_invited', ar: 'مزود مدعو',          en: 'Provider invited' },
  { value: 'public_limited',   ar: 'عام محدود',          en: 'Public (limited)' },
];

const emptyForm = {
  label: '', site_name: '', site_type: 'other' as SiteType, visibility: 'private' as Visibility,
  contact_name: '', contact_phone: '',
  map_url: '', latitude: '', longitude: '',
  access_notes: '', is_default: false,
  municipal_license_no: '', municipal_license_issue_date: '', municipal_license_expiry_date: '',
  title_deed_no: '', title_deed_date: '',
  owner_name: '', owner_id_number: '', land_use_type: '',
  plot_number: '', block_number: '', plan_number: '', government_notes: '',
};

const emptyNaf: NationalAddressValue = {
  short_address: null, region: null, region_en: null, city_id: null,
  district: null, district_en: null,
  street_name: null, street_name_en: null,
  building_number: null, additional_number: null, post_code: null,
  address: null, address_en: null, address_manual: false,
};

/** Tabs that group form fields — used to jump to the failing tab. */
type FormTab = 'general' | 'address' | 'government' | 'contact';

/** A single validation issue surfaced to the user. */
interface FormIssue {
  field: string;          // input id used for scrollIntoView + ring highlight
  tab: FormTab;           // which tab the field lives in
  code: string;           // stable code (server or client)
  title_ar: string;
  title_en: string;
  cause_ar: string;       // why it failed (plain language)
  cause_en: string;
  fix_ar: string;         // how to fix it
  fix_en: string;
}

/** Stable catalogue of every error/warning we can show. */
const ISSUE_CATALOG: Record<string, Omit<FormIssue, 'field' | 'tab'>> = {
  LABEL_REQUIRED: {
    code: 'LABEL_REQUIRED',
    title_ar: 'الاسم المختصر مطلوب', title_en: 'Site label is required',
    cause_ar: 'لم يتم إدخال اسم مختصر للموقع، وهو مطلوب لتمييز الموقع داخل القائمة.',
    cause_en: 'No short label was entered. It is required to identify the site in the list.',
    fix_ar: 'افتح تبويب «الأساسيات» وأدخل اسماً مختصراً مثل: فيلا العميل، المعرض الرئيسي.',
    fix_en: 'Open the "General" tab and enter a short label such as "Client villa" or "Main showroom".',
  },
  BUSINESS_ID_REQUIRED: {
    code: 'BUSINESS_ID_REQUIRED',
    title_ar: 'لا توجد منشأة مرتبطة بحسابك', title_en: 'No business linked to your account',
    cause_ar: 'لا يمكن إنشاء مواقع بدون منشأة مالكة. حسابك غير مرتبط بأي منشأة حالياً.',
    cause_en: 'A site needs an owner business. Your account is not linked to any business yet.',
    fix_ar: 'انتقل إلى «إدارة المنشأة» وأنشئ منشأتك أو اطلب من المالك ربط حسابك بها.',
    fix_en: 'Go to "Business Management" and create your business, or ask the owner to link your account.',
  },
  CITY_REQUIRED: {
    code: 'CITY_REQUIRED',
    title_ar: 'يجب اختيار المدينة', title_en: 'City is required',
    cause_ar: 'لم يتم اختيار المدينة من قائمة العنوان الوطني، وهي مطلوبة لربط الموقع بالعقود والتنبيهات.',
    cause_en: 'No city was selected from the National Address list. It is required to link the site to contracts.',
    fix_ar: 'في تبويب «العنوان والخريطة» اختر المنطقة ثم المدينة من القائمة المنسدلة.',
    fix_en: 'In the "Address & Map" tab, pick the region then the city from the dropdown.',
  },
  ADDRESS_REQUIRED: {
    code: 'ADDRESS_REQUIRED',
    title_ar: 'أكمل بيانات العنوان الوطني', title_en: 'Complete the National Address',
    cause_ar: 'بيانات العنوان الوطني غير كافية لتكوين سطر عنوان رسمي للموقع.',
    cause_en: 'The National Address data is not enough to build an official address line.',
    fix_ar: 'املأ المنطقة + المدينة + الحي على الأقل في تبويب «العنوان والخريطة».',
    fix_en: 'Fill at least Region + City + District in the "Address & Map" tab.',
  },
  INVALID_SHORT_ADDRESS: {
    code: 'INVALID_SHORT_ADDRESS',
    title_ar: 'صيغة العنوان الوطني المختصر غير صحيحة',
    title_en: 'Invalid Short National Address format',
    cause_ar: 'يجب أن يتكون العنوان المختصر من 4 أحرف إنجليزية ثم 4 أرقام بدون فواصل (مثل: RQQA6904).',
    cause_en: 'The short address must be 4 letters then 4 digits with no spaces (e.g. RQQA6904).',
    fix_ar: 'أعد إدخال الكود من تطبيق العنوان الوطني، أو اتركه فارغاً لحفظ الموقع بدونه.',
    fix_en: 'Re-enter the code from the National Address app, or leave it blank to save without it.',
  },
  INVALID_LATITUDE: {
    code: 'INVALID_LATITUDE',
    title_ar: 'إحداثيات خط العرض غير صحيحة', title_en: 'Invalid latitude',
    cause_ar: 'قيمة خط العرض يجب أن تكون بين -90 و 90.',
    cause_en: 'Latitude must be between -90 and 90.',
    fix_ar: 'استخدم زر «تحديد على الخريطة» لاختيار النقطة تلقائياً بدلاً من الإدخال اليدوي.',
    fix_en: 'Use "Pin on map" to set the location automatically instead of typing it.',
  },
  INVALID_LONGITUDE: {
    code: 'INVALID_LONGITUDE',
    title_ar: 'إحداثيات خط الطول غير صحيحة', title_en: 'Invalid longitude',
    cause_ar: 'قيمة خط الطول يجب أن تكون بين -180 و 180.',
    cause_en: 'Longitude must be between -180 and 180.',
    fix_ar: 'استخدم زر «تحديد على الخريطة» لاختيار النقطة تلقائياً بدلاً من الإدخال اليدوي.',
    fix_en: 'Use "Pin on map" to set the location automatically instead of typing it.',
  },
  INVALID_MAP_URL: {
    code: 'INVALID_MAP_URL',
    title_ar: 'رابط الخريطة غير صالح', title_en: 'Invalid map URL',
    cause_ar: 'الرابط لا يبدأ بـ http:// أو https://، أو يحتوي على رموز غير مدعومة.',
    cause_en: 'The URL does not start with http:// or https://, or contains unsupported characters.',
    fix_ar: 'انسخ الرابط مباشرة من Google Maps أو اتركه فارغاً ليُولَّد تلقائياً عند تحديد الموقع.',
    fix_en: 'Copy the link from Google Maps directly, or leave it empty to auto-generate from the pin.',
  },
  INVALID_LICENSE_DATES: {
    code: 'INVALID_LICENSE_DATES',
    title_ar: 'تواريخ رخصة البلدية غير منطقية',
    title_en: 'Municipal license dates are inconsistent',
    cause_ar: 'تاريخ انتهاء الرخصة سابق لتاريخ إصدارها، وهذا غير ممكن.',
    cause_en: 'License expiry is earlier than its issue date, which is not allowed.',
    fix_ar: 'صحّح أحد التاريخين في تبويب «البيانات الحكومية» بحيث يكون الانتهاء بعد الإصدار.',
    fix_en: 'Fix one of the dates in the "Government" tab so expiry is after issue date.',
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    title_ar: 'ليست لديك صلاحية لهذا الإجراء', title_en: 'You are not allowed to do this',
    cause_ar: 'حسابك ليس المالك أو المدير لهذه المنشأة، لذلك لا يمكنك إضافة/تعديل مواقعها.',
    cause_en: 'Your account is not the owner or manager of this business.',
    fix_ar: 'تواصل مع مالك المنشأة لمنحك صلاحية «مدير» من إعدادات الفريق.',
    fix_en: 'Ask the business owner to grant you the "Manager" role from team settings.',
  },
  INVALID_SITE_TYPE: {
    code: 'INVALID_SITE_TYPE',
    title_ar: 'نوع الموقع غير صالح', title_en: 'Invalid site type',
    cause_ar: 'القيمة المختارة لنوع الموقع غير مدعومة في النظام.',
    cause_en: 'The selected site type value is not supported.',
    fix_ar: 'أعد اختيار نوع الموقع من القائمة في تبويب «الأساسيات».',
    fix_en: 'Re-select the site type from the list in the "General" tab.',
  },
  INVALID_VISIBILITY: {
    code: 'INVALID_VISIBILITY',
    title_ar: 'إعداد الخصوصية غير صالح', title_en: 'Invalid visibility setting',
    cause_ar: 'القيمة المختارة لخصوصية الموقع غير مدعومة.',
    cause_en: 'The selected visibility value is not supported.',
    fix_ar: 'اختر أحد خيارات الخصوصية من القائمة في تبويب «الأساسيات».',
    fix_en: 'Pick one of the visibility options in the "General" tab.',
  },
  UNKNOWN: {
    code: 'UNKNOWN',
    title_ar: 'حدث خطأ غير متوقع أثناء الحفظ', title_en: 'Unexpected error while saving',
    cause_ar: 'تعذّر إكمال الحفظ بسبب خطأ في الاتصال أو خطأ غير معروف من الخادم.',
    cause_en: 'Save could not be completed due to a connection or unknown server error.',
    fix_ar: 'تحقق من الاتصال بالإنترنت ثم أعد المحاولة. إن تكرّر الخطأ راسل الدعم مع الرسالة الأصلية.',
    fix_en: 'Check your connection and try again. If it persists, contact support with the original message.',
  },
};

const issueOf = (code: string, field: string, tab: FormTab, override?: Partial<FormIssue>): FormIssue => {
  const base = ISSUE_CATALOG[code] ?? ISSUE_CATALOG.UNKNOWN;
  return { ...base, ...override, field, tab };
};

export default function DashboardSites() {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ClientSite | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [naf, setNaf] = useState<NationalAddressValue>(emptyNaf);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<SiteType | 'all'>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedBarcode, setExpandedBarcode] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<FormTab>('general');
  const [issues, setIssues] = useState<FormIssue[]>([]);
  /** Quick lookup: { field -> true } for ring/error highlighting on inputs. */
  const errorFields = useMemo(() => {
    const m: Record<string, boolean> = {};
    issues.forEach(i => { m[i.field] = true; });
    return m;
  }, [issues]);
  const [advLicenseNo, setAdvLicenseNo] = useState('');
  const [advDeedNo, setAdvDeedNo] = useState('');
  const [advOwnerId, setAdvOwnerId] = useState('');
  const [advIssueFrom, setAdvIssueFrom] = useState('');
  const [advIssueTo, setAdvIssueTo] = useState('');
  const [advExpiryFrom, setAdvExpiryFrom] = useState('');
  const [advExpiryTo, setAdvExpiryTo] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const focusRef = useRef<HTMLDivElement | null>(null);

  // Consume ?focus=<site_ref or id> to auto-search and scroll to that card.
  useEffect(() => {
    const f = searchParams.get('focus');
    if (f) {
      setSearch(f);
      requestAnimationFrame(() => focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      // Clean URL so refresh doesn't re-trigger.
      const next = new URLSearchParams(searchParams);
      next.delete('focus');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Owner business ─── */
  const { data: business } = useQuery({
    queryKey: ['my-business-id', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await getOwnerBusiness<{ id: string; name_ar: string | null; name_en: string | null }>({
        userId: user.id, select: 'id, name_ar, name_en',
      });
      return data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });
  const businessId = business?.id ?? null;

  /* ─── Cities reference (for resolving city name from city_id picked in NAF) ─── */
  const { data: citiesRef = [] } = useQuery({
    queryKey: ['active-cities-ref'],
    queryFn: async () => {
      const { data } = await listActiveCities<{ id: string; name_ar: string; name_en: string | null }>({
        select: 'id, name_ar, name_en', order: 'name_ar',
      });
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  /* ─── Sites (RLS filters automatically) ─── */
  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['dashboard-sites', businessId, user?.id, showArchived],
    queryFn: async () => {
      if (!user) return [];
      let q = supabase.from('client_sites').select('*').order('is_default', { ascending: false }).order('created_at', { ascending: false });
      if (!showArchived) q = q.is('archived_at', null);
      if (businessId) q = q.eq('business_id', businessId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ClientSite[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  /* ─── Contracts linked per site ─── */
  const { data: contractCounts = {} } = useQuery({
    queryKey: ['site-contract-counts', businessId, sites.map(s => s.id).join(',')],
    queryFn: async () => {
      if (!sites.length) return {} as Record<string, number>;
      const ids = sites.map(s => s.id);
      const { data } = await supabase
        .from('contracts')
        .select('execution_site_id')
        .in('execution_site_id', ids);
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: { execution_site_id: string | null }) => {
        if (r.execution_site_id) map[r.execution_site_id] = (map[r.execution_site_id] ?? 0) + 1;
      });
      return map;
    },
    enabled: sites.length > 0,
    staleTime: 60_000,
  });

  /* ─── Mutations ─── */
  /**
   * Client-side validator — runs before we hit the RPC so we can show
   * an inline, actionable issues panel instead of a generic toast.
   * Mirrors the server checks in `create_client_site` / `update_client_site`.
   */
  const validate = useCallback((): FormIssue[] => {
    const out: FormIssue[] = [];
    if (!businessId && !editing) out.push(issueOf('BUSINESS_ID_REQUIRED', 'label', 'general'));
    if (!form.label.trim()) out.push(issueOf('LABEL_REQUIRED', 'label', 'general'));
    if (!naf.city_id) out.push(issueOf('CITY_REQUIRED', 'city', 'address'));
    const composedAr = (naf.address && naf.address.trim()) || buildAddressLine(naf, 'ar');
    if (!composedAr) out.push(issueOf('ADDRESS_REQUIRED', 'address', 'address'));
    const rawShort = (naf.short_address ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (rawShort && !/^[A-Z]{4}[0-9]{4}$/.test(rawShort)) {
      out.push(issueOf('INVALID_SHORT_ADDRESS', 'short_address', 'address'));
    }
    if (form.latitude) {
      const lat = Number(form.latitude);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) out.push(issueOf('INVALID_LATITUDE', 'latitude', 'address'));
    }
    if (form.longitude) {
      const lng = Number(form.longitude);
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) out.push(issueOf('INVALID_LONGITUDE', 'longitude', 'address'));
    }
    if (form.map_url.trim() && !/^https?:\/\//i.test(form.map_url.trim())) {
      out.push(issueOf('INVALID_MAP_URL', 'map_url', 'address'));
    }
    if (form.municipal_license_issue_date && form.municipal_license_expiry_date
        && form.municipal_license_expiry_date < form.municipal_license_issue_date) {
      out.push(issueOf('INVALID_LICENSE_DATES', 'municipal_license_expiry_date', 'government'));
    }
    return out;
  }, [businessId, editing, form, naf]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!businessId && !editing) throw new Error(isRTL ? 'لا توجد منشأة مرتبطة' : 'No business linked');
      // Compose the canonical address line from the National Address fields,
      // unless the user explicitly typed a custom Arabic line (address_manual).
      const composedAr = (naf.address && naf.address.trim()) || buildAddressLine(naf, 'ar');
      const composedEn = (naf.address_en && naf.address_en.trim()) || buildAddressLine(naf, 'en');
      const city = naf.city_id ? citiesRef.find((c) => c.id === naf.city_id) : null;
      if (!composedAr) {
        throw new Error(isRTL ? 'أكمل بيانات العنوان الوطني (المنطقة / المدينة / الحي على الأقل)' : 'Complete the National Address (region / city / district at minimum)');
      }
      // Saudi National short address must be exactly 4 letters + 4 digits.
      // If the user typed a partial value, drop it instead of failing the whole save.
      const rawShort = (naf.short_address ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const validShort = /^[A-Z]{4}[0-9]{4}$/.test(rawShort) ? rawShort : null;
      const payload = {
        business_id: editing?.business_id ?? businessId,
        label: form.label.trim(),
        site_name: form.site_name.trim() || null,
        site_type: form.site_type,
        visibility: form.visibility,
        contact_name: form.contact_name.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        city_id: naf.city_id,
        city_name: city?.name_ar ?? null,
        district: naf.district,
        district_en: naf.district_en,
        region: naf.region,
        region_en: naf.region_en,
        street_name: naf.street_name,
        street_name_en: naf.street_name_en,
        building_number: naf.building_number,
        additional_number: naf.additional_number,
        post_code: naf.post_code,
        short_address: validShort,
        address_en: composedEn || null,
        address_line1: composedAr,
        address_line2: validShort ? `العنوان الوطني: ${validShort}` : null,
        map_url: form.map_url.trim() || null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        access_notes: form.access_notes.trim() || null,
        is_default: form.is_default,
        municipal_license_no:           form.municipal_license_no.trim() || null,
        municipal_license_issue_date:   form.municipal_license_issue_date || null,
        municipal_license_expiry_date:  form.municipal_license_expiry_date || null,
        title_deed_no:                  form.title_deed_no.trim() || null,
        title_deed_date:                form.title_deed_date || null,
        owner_name:                     form.owner_name.trim() || null,
        owner_id_number:                form.owner_id_number.trim() || null,
        land_use_type:                  form.land_use_type.trim() || null,
        plot_number:                    form.plot_number.trim() || null,
        block_number:                   form.block_number.trim() || null,
        plan_number:                    form.plan_number.trim() || null,
        government_notes:               form.government_notes.trim() || null,
      } satisfies Record<string, Json | null | undefined>;
      if (editing) {
        const { error } = await supabase.rpc('update_client_site', { _site_id: editing.id, _patch: payload as Json });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('create_client_site', { _payload: payload as Json });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-sites'] });
      toast.success(editing ? (isRTL ? 'تم تحديث الموقع' : 'Site updated') : (isRTL ? 'تم إضافة الموقع' : 'Site added'));
      setIssues([]);
      closeForm();
    },
    onError: (err: unknown) => {
      const raw = err instanceof Error ? err.message : String(err ?? '');
      const tabFor: Record<string, FormTab> = {
        LABEL_REQUIRED: 'general', INVALID_SITE_TYPE: 'general', INVALID_VISIBILITY: 'general',
        BUSINESS_ID_REQUIRED: 'general', FORBIDDEN: 'general',
        ADDRESS_REQUIRED: 'address', INVALID_SHORT_ADDRESS: 'address',
        INVALID_LATITUDE: 'address', INVALID_LONGITUDE: 'address', INVALID_MAP_URL: 'address',
        INVALID_LICENSE_DATES: 'government',
      };
      const fieldFor: Record<string, string> = {
        LABEL_REQUIRED: 'label', INVALID_SITE_TYPE: 'site_type', INVALID_VISIBILITY: 'visibility',
        BUSINESS_ID_REQUIRED: 'label', FORBIDDEN: 'label',
        ADDRESS_REQUIRED: 'address', INVALID_SHORT_ADDRESS: 'short_address',
        INVALID_LATITUDE: 'latitude', INVALID_LONGITUDE: 'longitude', INVALID_MAP_URL: 'map_url',
        INVALID_LICENSE_DATES: 'municipal_license_expiry_date',
      };
      const code = Object.keys(ISSUE_CATALOG).find(k => raw.includes(k)) ?? 'UNKNOWN';
      const issue = issueOf(code, fieldFor[code] ?? 'label', tabFor[code] ?? 'general',
        code === 'UNKNOWN' && raw
          ? { cause_ar: `${ISSUE_CATALOG.UNKNOWN.cause_ar} (${raw})`, cause_en: `${ISSUE_CATALOG.UNKNOWN.cause_en} (${raw})` }
          : undefined);
      setIssues([issue]);
      setActiveTab(issue.tab);
      toast.error(isRTL ? issue.title_ar : issue.title_en);
    },
  });

  const archiveMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('archive_client_site', { _site_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-sites'] });
      setDeleteConfirm(null);
      toast.success(isRTL ? 'تم الأرشفة' : 'Archived');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Failed'),
  });

  /* ─── Derived ─── */
  const filtered = useMemo(() => {
    let r = sites;
    if (typeFilter !== 'all') r = r.filter(s => s.site_type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(s =>
        s.label.toLowerCase().includes(q) ||
        (s.site_name || '').toLowerCase().includes(q) ||
        (s.address_line1 || '').toLowerCase().includes(q) ||
        (s.city_name || '').toLowerCase().includes(q) ||
        (s.contact_name || '').toLowerCase().includes(q) ||
        (s.site_ref || '').toLowerCase().includes(q) ||
        (s.municipal_license_no || '').toLowerCase().includes(q) ||
        (s.title_deed_no || '').toLowerCase().includes(q) ||
        (s.owner_name || '').toLowerCase().includes(q) ||
        (s.owner_id_number || '').toLowerCase().includes(q)
      );
    }
    if (advLicenseNo.trim()) {
      const q = advLicenseNo.trim().toLowerCase();
      r = r.filter(s => (s.municipal_license_no || '').toLowerCase().includes(q));
    }
    if (advDeedNo.trim()) {
      const q = advDeedNo.trim().toLowerCase();
      r = r.filter(s => (s.title_deed_no || '').toLowerCase().includes(q));
    }
    if (advOwnerId.trim()) {
      const q = advOwnerId.trim().toLowerCase();
      r = r.filter(s => (s.owner_id_number || '').toLowerCase().includes(q));
    }
    if (advIssueFrom) r = r.filter(s => !!s.municipal_license_issue_date && s.municipal_license_issue_date >= advIssueFrom);
    if (advIssueTo)   r = r.filter(s => !!s.municipal_license_issue_date && s.municipal_license_issue_date <= advIssueTo);
    if (advExpiryFrom) r = r.filter(s => !!s.municipal_license_expiry_date && s.municipal_license_expiry_date >= advExpiryFrom);
    if (advExpiryTo)   r = r.filter(s => !!s.municipal_license_expiry_date && s.municipal_license_expiry_date <= advExpiryTo);
    return r;
  }, [sites, search, typeFilter, advLicenseNo, advDeedNo, advOwnerId, advIssueFrom, advIssueTo, advExpiryFrom, advExpiryTo]);

  const advancedActive = !!(advLicenseNo || advDeedNo || advOwnerId || advIssueFrom || advIssueTo || advExpiryFrom || advExpiryTo);
  const resetAdvanced = () => {
    setAdvLicenseNo(''); setAdvDeedNo(''); setAdvOwnerId('');
    setAdvIssueFrom(''); setAdvIssueTo(''); setAdvExpiryFrom(''); setAdvExpiryTo('');
  };

  const stats = useMemo(() => {
    const total = sites.filter(s => !s.archived_at).length;
    const linked = Object.values(contractCounts).reduce((a, b) => a + b, 0);
    const types = new Set(sites.map(s => s.site_type)).size;
    const archived = sites.filter(s => s.archived_at).length;
    return { total, linked, types, archived };
  }, [sites, contractCounts]);

  /* ─── Callbacks ─── */
  const closeForm = useCallback(() => {
    setShowForm(false); setEditing(null); setForm(emptyForm); setNaf(emptyNaf);
    setIssues([]); setActiveTab('general');
  }, []);
  const openCreate = useCallback(() => {
    setEditing(null); setForm(emptyForm); setNaf(emptyNaf);
    setIssues([]); setActiveTab('general'); setShowForm(true);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, []);
  const openEdit = useCallback((s: ClientSite) => {
    setEditing(s);
    setForm({
      label: s.label, site_name: s.site_name || '', site_type: s.site_type, visibility: s.visibility,
      contact_name: s.contact_name || '', contact_phone: s.contact_phone || '',
      map_url: s.map_url || '', latitude: s.latitude != null ? String(s.latitude) : '',
      longitude: s.longitude != null ? String(s.longitude) : '',
      access_notes: s.access_notes || '', is_default: s.is_default,
      municipal_license_no:           s.municipal_license_no || '',
      municipal_license_issue_date:   s.municipal_license_issue_date || '',
      municipal_license_expiry_date:  s.municipal_license_expiry_date || '',
      title_deed_no:                  s.title_deed_no || '',
      title_deed_date:                s.title_deed_date || '',
      owner_name:                     s.owner_name || '',
      owner_id_number:                s.owner_id_number || '',
      land_use_type:                  s.land_use_type || '',
      plot_number:                    s.plot_number || '',
      block_number:                   s.block_number || '',
      plan_number:                    s.plan_number || '',
      government_notes:               s.government_notes || '',
    });
    setNaf({
      short_address: s.short_address, region: s.region, region_en: s.region_en,
      city_id: s.city_id, district: s.district, district_en: s.district_en,
      street_name: s.street_name, street_name_en: s.street_name_en,
      building_number: s.building_number, additional_number: s.additional_number,
      post_code: s.post_code,
      address: s.address_line1, address_en: s.address_en,
      address_manual: false,
    });
    setShowForm(true);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, []);

  const goToContracts = useCallback((siteId: string) => {
    navigate(`/dashboard/contracts?site=${siteId}`);
  }, [navigate]);

  const goToNewContract = useCallback((siteId: string) => {
    navigate(`/dashboard/contracts?tab=create&site=${siteId}`);
  }, [navigate]);

  const typeMeta = (t: SiteType) => SITE_TYPES.find(x => x.value === t) ?? SITE_TYPES[SITE_TYPES.length - 1];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-xl">{isRTL ? 'عناوين المواقع' : 'Site Addresses'}</h1>
              <p className="text-xs text-muted-foreground">
                {isRTL ? `${stats.total} موقع · ${stats.linked} عقد مرتبط` : `${stats.total} sites · ${stats.linked} linked contracts`}
              </p>
            </div>
          </div>
          {businessId && (
            <Button variant="hero" size="sm" className="h-8 text-xs" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5 me-1" />{isRTL ? 'إضافة موقع' : 'Add Site'}
            </Button>
          )}
        </div>

        {/* Stats */}
        {sites.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              { l: isRTL ? 'النشطة' : 'Active', v: stats.total, icon: MapPin, cls: 'text-primary bg-primary/10' },
              { l: isRTL ? 'العقود المرتبطة' : 'Linked Contracts', v: stats.linked, icon: FileText, cls: 'text-accent bg-accent/10' },
              { l: isRTL ? 'أنواع المواقع' : 'Site Types', v: stats.types, icon: Layers, cls: 'text-primary bg-primary/10' },
              { l: isRTL ? 'المؤرشفة' : 'Archived', v: stats.archived, icon: AlertCircle, cls: 'text-muted-foreground bg-muted' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/40 bg-card/50">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.cls}`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-base font-bold leading-none tech-content">{s.v}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.l}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!businessId && !isLoading && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-300/40 bg-amber-50/50 dark:bg-amber-950/20">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs">
              {isRTL ? 'تظهر لك هنا المواقع المرتبطة بحسابك فقط. لإضافة مواقع جديدة، يلزم ربط منشأة بحسابك.' : 'Showing sites linked to your account only. Link a business to add new sites.'}
            </p>
          </div>
        )}

        {/* Form (inline) */}
        {showForm && (
          <div ref={formRef}>
            <Card className="border-primary/20 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
              <CardHeader className="pb-3 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {editing ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                    {editing ? (isRTL ? 'تعديل الموقع' : 'Edit Site') : (isRTL ? 'إضافة موقع جديد' : 'New Site')}
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={closeForm}><X className="w-4 h-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pb-5">
                {issues.length > 0 && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <h3 className="text-xs font-bold">
                        {isRTL
                          ? `يوجد ${issues.length} ${issues.length === 1 ? 'مشكلة' : 'مشاكل'} يجب معالجتها قبل الحفظ`
                          : `${issues.length} ${issues.length === 1 ? 'issue' : 'issues'} to resolve before saving`}
                      </h3>
                    </div>
                    <ul className="space-y-2">
                      {issues.map((iss, idx) => (
                        <li key={idx} className="rounded-lg border border-destructive/30 bg-background/60 p-2.5 space-y-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab(iss.tab);
                              requestAnimationFrame(() => {
                                const el = document.getElementById(`site-field-${iss.field}`);
                                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                (el?.querySelector('input,select,textarea') as HTMLElement | null)?.focus();
                              });
                            }}
                            className="w-full flex items-start gap-2 text-start group"
                          >
                            <span className="mt-0.5 inline-flex w-5 h-5 items-center justify-center rounded-full bg-destructive/15 text-destructive text-[10px] font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-destructive group-hover:underline">
                                {isRTL ? iss.title_ar : iss.title_en}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-start gap-1">
                                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                                <span>{isRTL ? iss.cause_ar : iss.cause_en}</span>
                              </p>
                              <p className="text-[11px] text-foreground mt-0.5 flex items-start gap-1">
                                <HelpCircle className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
                                <span>{isRTL ? iss.fix_ar : iss.fix_en}</span>
                              </p>
                            </div>
                            <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5 ${isRTL ? 'rotate-180' : ''}`} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FormTab)} className="w-full">
                  <TabsList className="w-full grid grid-cols-4 h-auto p-1">
                    <TabsTrigger value="general" className="text-[11px] gap-1.5"><Layers className="w-3.5 h-3.5" />{isRTL ? 'الأساسيات' : 'General'}</TabsTrigger>
                    <TabsTrigger value="address" className="text-[11px] gap-1.5"><MapPin className="w-3.5 h-3.5" />{isRTL ? 'العنوان والخريطة' : 'Address & Map'}</TabsTrigger>
                    <TabsTrigger value="government" className="text-[11px] gap-1.5"><Landmark className="w-3.5 h-3.5" />{isRTL ? 'البيانات الحكومية' : 'Government'}</TabsTrigger>
                    <TabsTrigger value="contact" className="text-[11px] gap-1.5"><User className="w-3.5 h-3.5" />{isRTL ? 'التواصل' : 'Contact'}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="general" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1.5" id="site-field-label">
                    <Label className="text-xs font-medium">{isRTL ? 'الاسم المختصر' : 'Label'} <span className="text-destructive">*</span></Label>
                    <Input
                      value={form.label}
                      onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                      placeholder={isRTL ? 'مثال: فيلا العميل' : 'e.g. Client villa'}
                      className={`h-9 ${errorFields.label ? 'ring-2 ring-destructive/60 border-destructive' : ''}`}
                      aria-invalid={!!errorFields.label}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{isRTL ? 'اسم الموقع' : 'Site Name'}</Label>
                    <Input value={form.site_name} onChange={e => setForm(p => ({ ...p, site_name: e.target.value }))} placeholder={isRTL ? 'اختياري' : 'Optional'} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{isRTL ? 'نوع الموقع' : 'Site Type'}</Label>
                    <Select value={form.site_type} onValueChange={(v) => setForm(p => ({ ...p, site_type: v as SiteType }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SITE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{isRTL ? t.ar : t.en}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{isRTL ? 'الخصوصية' : 'Visibility'}</Label>
                    <Select value={form.visibility} onValueChange={(v) => setForm(p => ({ ...p, visibility: v as Visibility }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VISIBILITY.map(t => <SelectItem key={t.value} value={t.value}>{isRTL ? t.ar : t.en}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border border-border/40">
                  <input type="checkbox" id="is_default" checked={form.is_default} onChange={e => setForm(p => ({ ...p, is_default: e.target.checked }))} className="w-4 h-4 rounded border-border" />
                  <label htmlFor="is_default" className="text-xs font-medium cursor-pointer">{isRTL ? 'تعيين كموقع افتراضي' : 'Set as default site'}</label>
                </div>
                  </TabsContent>

                  <TabsContent value="address" className="space-y-4 mt-4">
                <div
                  id="site-field-address"
                  className={`rounded-xl border bg-card/40 p-3 ${errorFields.address || errorFields.city || errorFields.short_address ? 'border-destructive/60 ring-1 ring-destructive/30' : 'border-border/50'}`}
                >
                  <NationalAddressForm value={naf} onChange={setNaf} isRTL={isRTL} />
                  <span id="site-field-city" className="sr-only" />
                  <span id="site-field-short_address" className="sr-only" />
                </div>

                {/* Interactive map picker (lat/lng + optional reverse-fill of region/district) */}
                <div className="rounded-xl border border-border/50 bg-card/40 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <MapIcon className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold">{isRTL ? 'تحديد الموقع على الخريطة' : 'Pin location on map'}</h3>
                  </div>
                  <LocationPicker
                    isRTL={isRTL}
                    latitude={form.latitude ? Number(form.latitude) : null}
                    longitude={form.longitude ? Number(form.longitude) : null}
                    onChange={(lat, lng) => setForm(p => ({
                      ...p,
                      latitude: String(lat),
                      longitude: String(lng),
                      map_url: p.map_url || `https://www.google.com/maps?q=${lat},${lng}`,
                    }))}
                    onAutofill={(r) => {
                      setNaf(prev => ({
                        ...prev,
                        region: r.region_ar ?? prev.region,
                        region_en: r.region_en ?? prev.region_en,
                        district: r.district_ar ?? prev.district,
                        district_en: r.district_en ?? prev.district_en,
                        address: r.address_ar ?? prev.address,
                        address_en: r.address_en ?? prev.address_en,
                      }));
                    }}
                  />
                  <div className="space-y-1.5" id="site-field-map_url">
                    <Label className="text-xs font-medium">{isRTL ? 'رابط خريطة مخصص (اختياري)' : 'Custom map URL (optional)'}</Label>
                    <Input
                      type="url" dir="ltr" value={form.map_url}
                      onChange={e => setForm(p => ({ ...p, map_url: e.target.value }))}
                      placeholder="https://maps.google.com/…"
                      className={`h-9 tech-content ${errorFields.map_url ? 'ring-2 ring-destructive/60 border-destructive' : ''}`}
                      aria-invalid={!!errorFields.map_url}
                    />
                    <span id="site-field-latitude" className="sr-only" />
                    <span id="site-field-longitude" className="sr-only" />
                  </div>
                </div>
                  </TabsContent>

                  <TabsContent value="government" className="space-y-3 mt-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/15 rounded-lg p-2.5">
                      <Landmark className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{isRTL ? 'بيانات الرخص الحكومية وصك الملكية والمالك — تستخدم تلقائياً في العقود المرتبطة بهذا الموقع.' : 'Government licenses, title deed, and ownership data — auto-attached to contracts linked to this site.'}</span>
                    </div>

                    <div className="rounded-xl border border-border/50 bg-card/40 p-3 space-y-3">
                      <div className="flex items-center gap-2 pb-1 border-b border-border/30">
                        <ScrollText className="w-3.5 h-3.5 text-primary" />
                        <h3 className="text-xs font-bold">{isRTL ? 'رخصة البلدية' : 'Municipal License'}</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">{isRTL ? 'رقم الرخصة' : 'License No.'}</Label>
                          <Input dir="ltr" value={form.municipal_license_no} onChange={e => setForm(p => ({ ...p, municipal_license_no: e.target.value }))} className="h-9 tech-content" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">{isRTL ? 'تاريخ الإصدار' : 'Issue Date'}</Label>
                          <Input type="date" dir="ltr" value={form.municipal_license_issue_date} onChange={e => setForm(p => ({ ...p, municipal_license_issue_date: e.target.value }))} className="h-9 tech-content" />
                        </div>
                        <div className="space-y-1.5" id="site-field-municipal_license_expiry_date">
                          <Label className="text-xs font-medium">{isRTL ? 'تاريخ الانتهاء' : 'Expiry Date'}</Label>
                          <Input
                            type="date" dir="ltr" value={form.municipal_license_expiry_date}
                            onChange={e => setForm(p => ({ ...p, municipal_license_expiry_date: e.target.value }))}
                            className={`h-9 tech-content ${errorFields.municipal_license_expiry_date ? 'ring-2 ring-destructive/60 border-destructive' : ''}`}
                            aria-invalid={!!errorFields.municipal_license_expiry_date}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/50 bg-card/40 p-3 space-y-3">
                      <div className="flex items-center gap-2 pb-1 border-b border-border/30">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        <h3 className="text-xs font-bold">{isRTL ? 'صك الملكية والمالك' : 'Title Deed & Owner'}</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">{isRTL ? 'رقم الصك' : 'Deed Number'}</Label>
                          <Input dir="ltr" value={form.title_deed_no} onChange={e => setForm(p => ({ ...p, title_deed_no: e.target.value }))} className="h-9 tech-content" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">{isRTL ? 'تاريخ الصك' : 'Deed Date'}</Label>
                          <Input type="date" dir="ltr" value={form.title_deed_date} onChange={e => setForm(p => ({ ...p, title_deed_date: e.target.value }))} className="h-9 tech-content" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">{isRTL ? 'اسم المالك' : 'Owner Name'}</Label>
                          <Input value={form.owner_name} onChange={e => setForm(p => ({ ...p, owner_name: e.target.value }))} className="h-9" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">{isRTL ? 'رقم هوية المالك' : 'Owner ID Number'}</Label>
                          <Input dir="ltr" value={form.owner_id_number} onChange={e => setForm(p => ({ ...p, owner_id_number: e.target.value }))} className="h-9 tech-content" />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/50 bg-card/40 p-3 space-y-3">
                      <div className="flex items-center gap-2 pb-1 border-b border-border/30">
                        <Layers className="w-3.5 h-3.5 text-primary" />
                        <h3 className="text-xs font-bold">{isRTL ? 'بيانات المخطط والاستخدام' : 'Plan & Land Use'}</h3>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">{isRTL ? 'نوع الاستخدام' : 'Land Use'}</Label>
                          <Input value={form.land_use_type} onChange={e => setForm(p => ({ ...p, land_use_type: e.target.value }))} placeholder={isRTL ? 'سكني / تجاري...' : 'Residential...'} className="h-9" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">{isRTL ? 'رقم القطعة' : 'Plot No.'}</Label>
                          <Input dir="ltr" value={form.plot_number} onChange={e => setForm(p => ({ ...p, plot_number: e.target.value }))} className="h-9 tech-content" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">{isRTL ? 'رقم البلوك' : 'Block No.'}</Label>
                          <Input dir="ltr" value={form.block_number} onChange={e => setForm(p => ({ ...p, block_number: e.target.value }))} className="h-9 tech-content" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">{isRTL ? 'رقم المخطط' : 'Plan No.'}</Label>
                          <Input dir="ltr" value={form.plan_number} onChange={e => setForm(p => ({ ...p, plan_number: e.target.value }))} className="h-9 tech-content" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">{isRTL ? 'ملاحظات حكومية' : 'Government Notes'}</Label>
                        <Textarea value={form.government_notes} onChange={e => setForm(p => ({ ...p, government_notes: e.target.value }))} rows={2} placeholder={isRTL ? 'رخص إضافية، اشتراطات، تصاريح...' : 'Additional permits, conditions...'} className="text-sm resize-none" />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="contact" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1"><User className="w-3.5 h-3.5" />{isRTL ? 'اسم الجهة المسؤولة' : 'Contact Name'}</Label>
                    <Input value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{isRTL ? 'رقم التواصل' : 'Contact Phone'}</Label>
                    <Input dir="ltr" value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} className="h-9 tech-content" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{isRTL ? 'ملاحظات الوصول' : 'Access notes'}</Label>
                  <Textarea value={form.access_notes} onChange={e => setForm(p => ({ ...p, access_notes: e.target.value }))} rows={2} placeholder={isRTL ? 'أرقام البوابات، أوقات الوصول...' : 'Gate numbers, access hours...'} className="text-sm resize-none" />
                </div>
                  </TabsContent>
                </Tabs>

                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={() => {
                      const found = validate();
                      if (found.length > 0) {
                        setIssues(found);
                        setActiveTab(found[0].tab);
                        toast.error(isRTL ? found[0].title_ar : found[0].title_en);
                        requestAnimationFrame(() => {
                          const el = document.getElementById(`site-field-${found[0].field}`);
                          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        });
                        return;
                      }
                      setIssues([]);
                      saveMut.mutate();
                    }}
                    disabled={saveMut.isPending}
                    variant="hero"
                    className="flex-1 h-9"
                  >
                    {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin me-1.5" /> : <CheckCircle2 className="w-4 h-4 me-1.5" />}
                    {saveMut.isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : editing ? (isRTL ? 'تحديث' : 'Update') : (isRTL ? 'إضافة' : 'Add')}
                  </Button>
                  <Button variant="outline" className="h-9" onClick={closeForm}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Toolbar */}
        {sites.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder={isRTL ? 'ابحث...' : 'Search...'} value={search}
                onChange={e => startTransition(() => setSearch(e.target.value))}
                className="ps-8 h-8 text-xs" />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as SiteType | 'all')}>
              <SelectTrigger className="w-auto h-8 gap-1 text-[11px] border-border/40">
                <Layers className="w-3 h-3" /><SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'كل الأنواع' : 'All types'}</SelectItem>
                {SITE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{isRTL ? t.ar : t.en}</SelectItem>)}
              </SelectContent>
            </Select>
            <button onClick={() => setShowArchived(v => !v)}
              className={`px-2.5 h-8 rounded-lg text-[11px] font-medium border transition-colors ${showArchived ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border/40 text-muted-foreground hover:bg-muted/50'}`}>
              {isRTL ? 'إظهار المؤرشفة' : 'Show archived'}
            </button>
            <button onClick={() => setShowAdvanced(v => !v)}
              className={`px-2.5 h-8 rounded-lg text-[11px] font-medium border transition-colors flex items-center gap-1.5 ${showAdvanced || advancedActive ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border/40 text-muted-foreground hover:bg-muted/50'}`}>
              <SlidersHorizontal className="w-3 h-3" />
              {isRTL ? 'فلترة متقدمة' : 'Advanced filters'}
              {advancedActive && <span className="ms-0.5 w-1.5 h-1.5 rounded-full bg-primary" />}
            </button>
          </div>
        )}

        {showAdvanced && (
          <div className="rounded-xl border border-border/50 bg-card/40 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold flex items-center gap-1.5"><Landmark className="w-3.5 h-3.5 text-primary" />{isRTL ? 'فلترة بالبيانات الحكومية' : 'Filter by government data'}</p>
              {advancedActive && (
                <button onClick={resetAdvanced} className="text-[10px] text-primary hover:underline">{isRTL ? 'مسح الكل' : 'Clear all'}</button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{isRTL ? 'رقم رخصة البلدية' : 'License No.'}</Label>
                <Input dir="ltr" value={advLicenseNo} onChange={e => setAdvLicenseNo(e.target.value)} className="h-8 text-xs tech-content" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{isRTL ? 'رقم الصك' : 'Deed No.'}</Label>
                <Input dir="ltr" value={advDeedNo} onChange={e => setAdvDeedNo(e.target.value)} className="h-8 text-xs tech-content" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{isRTL ? 'رقم هوية المالك' : 'Owner ID'}</Label>
                <Input dir="ltr" value={advOwnerId} onChange={e => setAdvOwnerId(e.target.value)} className="h-8 text-xs tech-content" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{isRTL ? 'إصدار من' : 'Issued from'}</Label>
                <Input type="date" dir="ltr" value={advIssueFrom} onChange={e => setAdvIssueFrom(e.target.value)} className="h-8 text-xs tech-content" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{isRTL ? 'إصدار إلى' : 'Issued to'}</Label>
                <Input type="date" dir="ltr" value={advIssueTo} onChange={e => setAdvIssueTo(e.target.value)} className="h-8 text-xs tech-content" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{isRTL ? 'انتهاء من' : 'Expiry from'}</Label>
                <Input type="date" dir="ltr" value={advExpiryFrom} onChange={e => setAdvExpiryFrom(e.target.value)} className="h-8 text-xs tech-content" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{isRTL ? 'انتهاء إلى' : 'Expiry to'}</Label>
                <Input type="date" dir="ltr" value={advExpiryTo} onChange={e => setAdvExpiryTo(e.target.value)} className="h-8 text-xs tech-content" />
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm (inline) */}
        {deleteConfirm && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-destructive/30 bg-destructive/5">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">{isRTL ? 'تأكيد الأرشفة' : 'Confirm archive'}</p>
              <p className="text-[11px] text-muted-foreground">{isRTL ? 'يمكنك استعادته لاحقًا بإظهار المؤرشفة' : 'You can restore it later from Archived'}</p>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDeleteConfirm(null)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => archiveMut.mutate(deleteConfirm)} disabled={archiveMut.isPending}>
              {archiveMut.isPending && <Loader2 className="w-3 h-3 animate-spin me-1" />}{isRTL ? 'أرشفة' : 'Archive'}
            </Button>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-44 rounded-xl" />)}
          </div>
        ) : sites.length === 0 && !showForm ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <MapPin className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-base font-semibold mb-1">{isRTL ? 'لا توجد مواقع بعد' : 'No sites yet'}</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-5">
              {isRTL ? 'أضف مواقع التنفيذ لتمكين ربطها بالعقود وأوامر العمل والفنيين.' : 'Add execution sites to link them with contracts, work orders, and technicians.'}
            </p>
            {businessId && (
              <Button variant="hero" size="sm" onClick={openCreate}><Plus className="w-4 h-4 me-1" />{isRTL ? 'إضافة أول موقع' : 'Add First Site'}</Button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-muted-foreground">
            <Search className="w-7 h-7 mb-2" />
            <p className="text-sm font-medium">{isRTL ? 'لا توجد نتائج' : 'No results'}</p>
            <button className="text-xs text-primary mt-1 hover:underline" onClick={() => { setSearch(''); setTypeFilter('all'); }}>{isRTL ? 'إعادة تعيين' : 'Reset filters'}</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(s => {
              const meta = typeMeta(s.site_type);
              const Icon = meta.icon;
              const linkedCount = contractCounts[s.id] ?? 0;
              const isArchived = !!s.archived_at;
              const isFocused = !!search && (s.site_ref === search.trim() || s.id === search.trim());
              return (
                <Card
                  key={s.id}
                  ref={isFocused ? focusRef : undefined}
                  className={`hover-lift border-border/50 ${isArchived ? 'opacity-60' : ''} ${isFocused ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-semibold text-sm truncate">{s.label}</h3>
                            {s.is_default && (
                              <Badge variant="outline" className="h-4 text-[9px] px-1 border-accent text-accent gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-current" />{isRTL ? 'افتراضي' : 'Default'}
                              </Badge>
                            )}
                            {isArchived && <Badge variant="outline" className="h-4 text-[9px] px-1">{isRTL ? 'مؤرشف' : 'Archived'}</Badge>}
                          </div>
                          {s.site_ref && <p className="text-[10px] text-muted-foreground tech-content mt-0.5">{s.site_ref}</p>}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[9px] shrink-0">{isRTL ? meta.ar : meta.en}</Badge>
                    </div>

                    <div className="space-y-1 text-xs">
                      <p className="text-muted-foreground line-clamp-2">{s.address_line1}{s.address_line2 ? `, ${s.address_line2}` : ''}</p>
                      {(s.city_name || s.district) && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />{[s.district, s.city_name].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {s.contact_name && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <User className="w-2.5 h-2.5" />{s.contact_name}
                          {s.contact_phone && <span className="tech-content ms-1">· {s.contact_phone}</span>}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                      <button onClick={() => goToContracts(s.id)}
                        className={`text-[10px] flex items-center gap-1 ${linkedCount > 0 ? 'text-primary hover:underline' : 'text-muted-foreground'}`}>
                        <FileText className="w-3 h-3" />
                        <span className="tech-content">{linkedCount}</span>
                        <span>{isRTL ? 'عقد' : 'contracts'}</span>
                        {linkedCount > 0 && <ArrowUpRight className="w-2.5 h-2.5" />}
                      </button>
                      <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="icon"
                            className={`h-7 w-7 ${expandedBarcode === s.id ? 'text-primary bg-primary/10' : ''}`}
                            onClick={() => setExpandedBarcode(v => v === s.id ? null : s.id)}
                            title={isRTL ? 'الباركود والطباعة' : 'Barcode & print'}>
                            <QrCode className="w-3.5 h-3.5" />
                          </Button>
                          {!isArchived && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10"
                              onClick={() => goToNewContract(s.id)} title={isRTL ? 'إنشاء عقد لهذا الموقع' : 'New contract for this site'}>
                              <FilePlus2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        {s.map_url && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <a href={s.map_url} target="_blank" rel="noopener noreferrer" title={isRTL ? 'فتح الخريطة' : 'Open map'}>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </Button>
                        )}
                        {!isArchived && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)} title={isRTL ? 'تعديل' : 'Edit'}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteConfirm(s.id)} title={isRTL ? 'أرشفة' : 'Archive'}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {expandedBarcode === s.id && (
                      <div className="pt-2 border-t border-border/40 -mx-1">
                        <SiteBarcodePanel siteId={s.id} siteRef={s.site_ref} label={s.label} isRTL={isRTL} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

/**
 * Lazy-loads the site's barcode and renders the shared BarcodeWidget.
 * Falls back to a friendly hint while the code is being provisioned.
 */
function SiteBarcodePanel({ siteId, siteRef, label, isRTL }: { siteId: string; siteRef: string | null; label: string; isRTL: boolean }) {
  const { data: code, isLoading } = useEntityBarcode('client_site', siteId);
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground py-3">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        {isRTL ? 'جاري تحميل الباركود...' : 'Loading barcode...'}
      </div>
    );
  }
  if (!code) {
    return (
      <div className="text-[11px] text-muted-foreground p-3 rounded-lg bg-muted/30 border border-dashed border-border/50">
        {isRTL ? 'لم يتم إصدار باركود لهذا الموقع بعد. سيتم توليده تلقائياً قريباً.' : 'No barcode issued for this site yet.'}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <BarcodeWidget
        barcodeCode={code}
        entityType="client_site"
        title={label}
        subtitle={siteRef ?? undefined}
        size="sm"
        className="border-0 shadow-none p-0 bg-transparent"
      />
      <Link
        to={`/dashboard/sites/${siteId}/print`}
        className="flex items-center justify-center gap-1.5 text-[11px] text-primary hover:underline py-1.5 rounded-lg border border-primary/20 bg-primary/5"
      >
        <Printer className="w-3 h-3" />
        {isRTL ? 'فتح صفحة الطباعة المخصصة (PDF / ملصق)' : 'Open dedicated print page (PDF / sticker)'}
      </Link>
    </div>
  );
}