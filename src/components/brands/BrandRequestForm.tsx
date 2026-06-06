/**
 * BrandRequestForm — professional inline "Request a new brand" form for
 * /dashboard/brands. Captures everything the admin reviewer needs in one
 * step: identity, sectors, country of origin, distributor/agent relationship,
 * logo, website, social links, and supporting certificates/documents.
 *
 * Strictly inline (no dialogs). All free-form arrays (socials, certificates)
 * are stored in the existing `documents` jsonb column with a `kind` tag so
 * admins can render them however they like — no migration required.
 */
import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Globe, Send, Tag, FileText, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CardContent, CardHeader, CardTitle, CardDescription, Card } from '@/components/ui/card';
import type { ProviderBrandRelationship } from '@/modules/brands';

type Loc = 'ar' | 'en';

export interface BrandRequestFormPayload {
  name_ar: string;
  name_en: string | null;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  proposed_country_of_origin_code: string | null;
  proposed_sector_ids: string[];
  relationship_type: ProviderBrandRelationship | null;
  /** Social profiles + certificates are bundled into the documents jsonb. */
  documents: Array<{ url: string; name?: string; kind?: 'social' | 'certificate' | 'document' }>;
  notes: string | null;
}

interface SectorOpt { id: string; name_ar: string; name_en: string | null }
interface CountryOpt { code: string; name_ar: string | null; name_en: string | null }

interface Props {
  isRTL: boolean;
  locale: Loc;
  sectors: SectorOpt[];
  countries: CountryOpt[];
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: BrandRequestFormPayload) => void;
}

const RELATIONSHIPS: ReadonlyArray<{ value: ProviderBrandRelationship; ar: string; en: string; needsDocs?: boolean }> = [
  { value: 'manufacturer',          ar: 'الصانع',                en: 'Manufacturer' },
  { value: 'official_agent',        ar: 'وكيل رسمي',            en: 'Official agent',         needsDocs: true },
  { value: 'authorized_distributor',ar: 'موزّع معتمد',          en: 'Authorized distributor', needsDocs: true },
  { value: 'distributor',           ar: 'موزّع',                 en: 'Distributor' },
  { value: 'reseller',              ar: 'تاجر تجزئة',           en: 'Reseller' },
  { value: 'importer',              ar: 'مستورد',                en: 'Importer' },
  { value: 'installer',             ar: 'مركّب',                 en: 'Installer' },
  { value: 'fabricator',            ar: 'مُصنّع موضعي',         en: 'Fabricator' },
  { value: 'maintenance_provider',  ar: 'مقدّم صيانة',          en: 'Maintenance provider' },
  { value: 'showroom',              ar: 'صالة عرض',             en: 'Showroom' },
  { value: 'supplier',              ar: 'مورّد',                 en: 'Supplier' },
  { value: 'other',                 ar: 'أخرى',                  en: 'Other' },
];

const isUrl = (v: string) => /^https?:\/\/.+\..+/i.test(v.trim());

export const BrandRequestForm: React.FC<Props> = ({
  isRTL, locale, sectors, countries, isSubmitting, onCancel, onSubmit,
}) => {
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [website, setWebsite] = useState('');
  const [country, setCountry] = useState<string>('');
  const [relationship, setRelationship] = useState<ProviderBrandRelationship | ''>('');
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [socials, setSocials] = useState<string[]>(['']);
  const [certs, setCerts] = useState<Array<{ name: string; url: string }>>([{ name: '', url: '' }]);
  const [notes, setNotes] = useState('');

  const rel = useMemo(() => RELATIONSHIPS.find((r) => r.value === relationship), [relationship]);
  const needsCerts = !!rel?.needsDocs;

  const logoOk = !logoUrl || isUrl(logoUrl);
  const websiteOk = !website || isUrl(website);
  const socialsClean = socials.map((s) => s.trim()).filter(Boolean);
  const certsClean = certs
    .map((c) => ({ name: c.name.trim(), url: c.url.trim() }))
    .filter((c) => c.url);
  const socialsValid = socialsClean.every(isUrl);
  const certsValid = certsClean.every((c) => isUrl(c.url));
  const certsRequiredOk = !needsCerts || certsClean.length > 0;

  const canSubmit =
    nameAr.trim().length > 0 &&
    logoOk && websiteOk && socialsValid && certsValid && certsRequiredOk && !isSubmitting;

  const completeness = useMemo(() => {
    const checks = [
      nameAr.trim().length > 0,
      nameEn.trim().length > 0,
      logoUrl.trim().length > 0 && logoOk,
      website.trim().length > 0 && websiteOk,
      !!country,
      selectedSectors.length > 0,
      !!relationship,
      socialsClean.length > 0,
      certsClean.length > 0,
      description.trim().length > 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [nameAr, nameEn, logoUrl, logoOk, website, websiteOk, country, selectedSectors, relationship, socialsClean.length, certsClean.length, description]);

  const toggleSector = (id: string) =>
    setSelectedSectors((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);

  const handleSubmit = () => {
    const docs: BrandRequestFormPayload['documents'] = [
      ...socialsClean.map((url) => ({ url, kind: 'social' as const })),
      ...certsClean.map((c) => ({ url: c.url, name: c.name || undefined, kind: 'certificate' as const })),
    ];
    onSubmit({
      name_ar: nameAr.trim(),
      name_en: nameEn.trim() || null,
      description: description.trim() || null,
      logo_url: logoUrl.trim() || null,
      website: website.trim() || null,
      proposed_country_of_origin_code: country || null,
      proposed_sector_ids: selectedSectors,
      relationship_type: (relationship || null) as ProviderBrandRelationship | null,
      documents: docs,
      notes: notes.trim() || null,
    });
  };

  return (
    <Card data-testid="brand-request-form">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="w-4 h-4" />
              {isRTL ? 'طلب إضافة علامة جديدة' : 'Request a new brand'}
            </CardTitle>
            <CardDescription className="mt-1">
              {isRTL
                ? 'كلما كانت البيانات أوفى، كانت المراجعة أسرع. الحقول التي تحمل (*) إلزامية.'
                : 'The more complete the request, the faster the review. Fields marked (*) are required.'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-xs text-muted-foreground">
              {isRTL ? 'اكتمال البيانات' : 'Completeness'}
            </div>
            <div className="w-28 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${completeness}%` }} />
            </div>
            <span className="tech-content text-xs font-semibold w-9 text-end">{completeness}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Identity */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isRTL ? 'هوية العلامة' : 'Identity'}
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{isRTL ? 'الاسم بالعربية *' : 'Arabic name *'}</Label>
              <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="h-11" dir="auto" />
            </div>
            <div className="space-y-1">
              <Label>{isRTL ? 'الاسم بالإنجليزية' : 'English name'}</Label>
              <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="h-11" dir="auto" />
            </div>
          </div>
          <div className="grid md:grid-cols-[10rem_1fr] gap-3 items-start">
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" />{isRTL ? 'شعار العلامة' : 'Logo'}</Label>
              <div className="aspect-square w-full rounded-xl border bg-muted/40 flex items-center justify-center overflow-hidden">
                {logoUrl && logoOk ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="logo preview" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                )}
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>{isRTL ? 'رابط الشعار (URL)' : 'Logo URL'}</Label>
                <Input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://…/logo.png"
                  className={`h-11 tech-content ${!logoOk ? 'border-destructive' : ''}`}
                  dir="ltr"
                />
                {!logoOk && (
                  <p className="text-[11px] text-destructive">{isRTL ? 'رابط غير صالح' : 'Invalid URL'}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />{isRTL ? 'الموقع الإلكتروني' : 'Website'}</Label>
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://brand.com"
                  className={`h-11 tech-content ${!websiteOk ? 'border-destructive' : ''}`}
                  dir="ltr"
                />
                {!websiteOk && (
                  <p className="text-[11px] text-destructive">{isRTL ? 'رابط غير صالح' : 'Invalid URL'}</p>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <Label>{isRTL ? 'نبذة عن العلامة' : 'Short description'}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} dir="auto" />
          </div>
        </section>

        {/* Sectors + country */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isRTL ? 'التصنيفات والمنشأ' : 'Categories & origin'}
          </h3>
          <div className="space-y-1.5">
            <Label>{isRTL ? 'القطاعات / التخصصات' : 'Sectors / specializations'}</Label>
            <div className="flex flex-wrap gap-1.5">
              {sectors.map((s) => {
                const active = selectedSectors.includes(s.id);
                const lbl = locale === 'ar' ? s.name_ar : (s.name_en ?? s.name_ar);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSector(s.id)}
                    className={[
                      'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card hover:bg-muted border-border text-foreground',
                    ].join(' ')}
                  >
                    {active && <ShieldCheck className="w-3 h-3" />}
                    {lbl}
                  </button>
                );
              })}
            </div>
            {selectedSectors.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {isRTL ? `محدد: ${selectedSectors.length}` : `Selected: ${selectedSectors.length}`}
              </p>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{isRTL ? 'بلد المنشأ' : 'Country of origin'}</Label>
              <Select value={country || 'none'} onValueChange={(v) => setCountry(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-11"><SelectValue placeholder={isRTL ? 'اختر…' : 'Select…'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{isRTL ? 'غير محدد' : 'Unspecified'}</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {locale === 'ar' ? (c.name_ar ?? c.code) : (c.name_en ?? c.code)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{isRTL ? 'علاقتك بالعلامة' : 'Your relationship'}</Label>
              <Select value={relationship || 'none'} onValueChange={(v) => setRelationship((v === 'none' ? '' : v) as ProviderBrandRelationship | '')}>
                <SelectTrigger className="h-11"><SelectValue placeholder={isRTL ? 'اختر…' : 'Select…'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{isRTL ? 'غير محدد' : 'Unspecified'}</SelectItem>
                  {RELATIONSHIPS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {locale === 'ar' ? r.ar : r.en}
                      {r.needsDocs && <span className="ms-1 text-[10px] text-warning">★</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {needsCerts && (
                <p className="text-[11px] text-warning mt-1">
                  {isRTL
                    ? 'يلزم إرفاق شهادة وكالة/توزيع رسمية لإثبات هذه العلاقة.'
                    : 'An official agency/distribution certificate is required to prove this relationship.'}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Socials */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isRTL ? 'الحسابات على وسائل التواصل' : 'Social media accounts'}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setSocials((s) => [...s, ''])}>
              <Plus className="w-3.5 h-3.5 me-1" />{isRTL ? 'إضافة' : 'Add'}
            </Button>
          </div>
          <div className="space-y-2">
            {socials.map((url, i) => {
              const invalid = url.trim() && !isUrl(url);
              return (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={url}
                    onChange={(e) => setSocials((s) => s.map((v, idx) => idx === i ? e.target.value : v))}
                    placeholder="https://instagram.com/brand"
                    className={`h-10 tech-content ${invalid ? 'border-destructive' : ''}`}
                    dir="ltr"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSocials((s) => s.filter((_, idx) => idx !== i))}
                    disabled={socials.length === 1}
                    aria-label={isRTL ? 'حذف' : 'Remove'}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Certificates / documents */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              {isRTL ? 'الشهادات والوثائق' : 'Certificates & documents'}
              {needsCerts && <Badge variant="outline" className="text-[10px] border-warning text-warning">{isRTL ? 'مطلوب' : 'Required'}</Badge>}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setCerts((c) => [...c, { name: '', url: '' }])}>
              <Plus className="w-3.5 h-3.5 me-1" />{isRTL ? 'إضافة' : 'Add'}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {isRTL
              ? 'ارفع الشهادة إلى مساحة تخزينك ثم الصق الرابط العام هنا (PDF/JPG).'
              : 'Upload the certificate to your storage and paste the public URL here (PDF/JPG).'}
          </p>
          <div className="space-y-2">
            {certs.map((c, i) => {
              const invalidUrl = c.url.trim() && !isUrl(c.url);
              return (
                <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_auto] gap-2">
                  <Input
                    value={c.name}
                    onChange={(e) => setCerts((cs) => cs.map((v, idx) => idx === i ? { ...v, name: e.target.value } : v))}
                    placeholder={isRTL ? 'اسم الشهادة (مثل: شهادة وكالة)' : 'Document name (e.g. agency cert)'}
                    className="h-10"
                    dir="auto"
                  />
                  <Input
                    value={c.url}
                    onChange={(e) => setCerts((cs) => cs.map((v, idx) => idx === i ? { ...v, url: e.target.value } : v))}
                    placeholder="https://…/cert.pdf"
                    className={`h-10 tech-content ${invalidUrl ? 'border-destructive' : ''}`}
                    dir="ltr"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCerts((cs) => cs.filter((_, idx) => idx !== i))}
                    disabled={certs.length === 1}
                    aria-label={isRTL ? 'حذف' : 'Remove'}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Notes */}
        <div className="space-y-1">
          <Label>{isRTL ? 'ملاحظات للإدارة' : 'Notes for reviewer'}</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} dir="auto" />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t">
          <Button variant="ghost" onClick={onCancel}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} data-testid="submit-brand-request-btn">
            <Send className="w-4 h-4 me-2" />
            {isRTL ? 'إرسال الطلب للمراجعة' : 'Submit request'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BrandRequestForm;