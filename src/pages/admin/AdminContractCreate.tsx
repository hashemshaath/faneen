import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, FileText, ShieldAlert, Send } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { adminCreateContractOnBehalf } from '@/modules/contracts/services/auditTrail';

/**
 * Admin-only: creates a draft contract between two other users. The
 * underlying RPC enforces that the acting admin cannot be a party.
 */
export default function AdminContractCreate() {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  useNoIndex();

  const [providerId, setProviderId] = useState('');
  const [clientId, setClientId] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');

  const adminIsParty =
    !!user && ((providerId && user.id === providerId) || (clientId && user.id === clientId));
  const providerEqClient = providerId && clientId && providerId === clientId;

  const mutation = useMutation({
    mutationFn: () =>
      adminCreateContractOnBehalf({
        providerId,
        clientId,
        titleAr,
        titleEn: titleEn || null,
        totalAmount: Number(totalAmount) || 0,
        currencyCode: currency,
        startDate: startDate || null,
        endDate: endDate || null,
        descriptionAr: descriptionAr || null,
      }),
    onSuccess: (contractId) => {
      toast({
        title: isRTL ? 'تم إنشاء العقد كمسوّدة' : 'Draft contract created',
        description: isRTL ? 'يمكن للطرفين مراجعته والموافقة عليه' : 'Both parties can review and approve it',
      });
      navigate(`/contracts/${contractId}`);
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        variant: 'destructive',
        title: isRTL ? 'تعذّر إنشاء العقد' : 'Failed to create contract',
        description: message,
      });
    },
  });

  const canSubmit = providerId && clientId && titleAr.trim() && !adminIsParty && !providerEqClient && !mutation.isPending;

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/admin/contracts"><ArrowLeft className="w-4 h-4" />{isRTL ? 'رجوع' : 'Back'}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading">
            <FileText className="w-5 h-5 text-accent" />
            {isRTL ? 'إنشاء عقد بالنيابة' : 'Create Contract on Behalf'}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {isRTL
              ? 'ينشئ الأدمن عقدًا كمسوّدة بين طرفين، ثم يرسله لكلا الطرفين للموافقة. لا يمكن للأدمن أن يكون طرفًا في العقد.'
              : 'Admin creates a draft contract between two parties, then sends it to both for approval. The admin cannot be a party.'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {adminIsParty && (
            <Alert variant="destructive">
              <ShieldAlert className="w-4 h-4" />
              <AlertDescription>{isRTL ? 'لا يمكن أن تكون طرفًا في العقد الذي تنشئه' : 'You cannot be a party to the contract you create'}</AlertDescription>
            </Alert>
          )}
          {providerEqClient && (
            <Alert variant="destructive">
              <ShieldAlert className="w-4 h-4" />
              <AlertDescription>{isRTL ? 'المزوّد والعميل يجب أن يكونا مختلفين' : 'Provider and client must be different users'}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="provider_id">{isRTL ? 'معرّف المزوّد (UUID)' : 'Provider ID (UUID)'}</Label>
              <Input id="provider_id" dir="ltr" value={providerId} onChange={(e) => setProviderId(e.target.value)} placeholder="00000000-0000-…" className="tech-content h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client_id">{isRTL ? 'معرّف العميل (UUID)' : 'Client ID (UUID)'}</Label>
              <Input id="client_id" dir="ltr" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="00000000-0000-…" className="tech-content h-11 rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="title_ar">{isRTL ? 'العنوان (عربي) *' : 'Title (Arabic) *'}</Label>
              <Input id="title_ar" dir="auto" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title_en">{isRTL ? 'العنوان (إنجليزي)' : 'Title (English)'}</Label>
              <Input id="title_en" dir="auto" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className="h-11 rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="total">{isRTL ? 'القيمة الإجمالية' : 'Total Amount'}</Label>
              <Input id="total" dir="ltr" inputMode="decimal" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} className="tech-content h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">{isRTL ? 'العملة' : 'Currency'}</Label>
              <Input id="currency" dir="ltr" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="tech-content h-11 rounded-xl" />
            </div>
            <div />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start">{isRTL ? 'تاريخ البدء' : 'Start Date'}</Label>
              <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-11 rounded-xl tech-content" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end">{isRTL ? 'تاريخ الانتهاء' : 'End Date'}</Label>
              <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-11 rounded-xl tech-content" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">{isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
            <Textarea id="desc" dir="auto" value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} className="rounded-xl min-h-[100px]" />
          </div>

          <div className="pt-2">
            <Button
              onClick={() => mutation.mutate()}
              disabled={!canSubmit}
              className="w-full sm:w-auto gap-2 h-11"
            >
              <Send className="w-4 h-4" />
              {mutation.isPending ? (isRTL ? 'جارٍ الإنشاء…' : 'Creating…') : (isRTL ? 'إنشاء وإرسال للموافقة' : 'Create & Send for Approval')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}