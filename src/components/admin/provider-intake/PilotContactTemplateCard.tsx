/**
 * PROVIDER INTAKE UX PROFESSIONALIZATION — Approved outreach template.
 *
 * Renders the operations-approved Pilot contact script with a one-click
 * "copy" affordance. Used inside `/admin/provider-leads` and
 * `/admin/provider-growth/queue` so operators send the same wording.
 *
 * No automatic dispatch — pure clipboard helper.
 */
import React from 'react';
import { Copy, Check, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bi, useBi } from '@/components/common/Bilingual';

export const PILOT_CONTACT_TEMPLATE_AR = `مرحبًا، نحن من منصة قطاعات.

نجهّز تجربة داخلية محدودة لربط العملاء بمزودي خدمات الألمنيوم والزجاج والحديد والخشب والتشطيبات داخل المملكة.

نرغب بتأكيد بيانات منشأتكم وإدراجكم ضمن أول مجموعة تجريبية لاستقبال طلبات عروض سعر بشكل يدوي ومحدود.

للتأكيد، نحتاج منكم:
- اسم مسؤول التواصل
- المدينة والحي
- أهم 3 خدمات تقدمونها
- هل توافقون على استقبال طلبات تجريبية من قطاعات؟

التجربة محدودة ولا يوجد إرسال تلقائي للطلبات؛ كل طلب تتم مراجعته يدويًا من فريق قطاعات.`;

export const PILOT_CONTACT_TEMPLATE_EN = `Hello, we're reaching out from the Qitaat platform.

We're preparing a limited internal pilot to connect customers with providers across aluminum, glass, steel, wood, and finishing services inside Saudi Arabia.

We'd like to confirm your facility details and include you in the first pilot cohort to receive manually-reviewed RFQs.

To confirm, we need:
- Primary contact name
- City and district
- Top 3 services you offer
- Do you agree to receive limited pilot RFQs from Qitaat?

The pilot is limited and there is no automatic dispatch — every RFQ is reviewed manually by the Qitaat operations team.`;

export interface PilotContactTemplateCardProps {
  className?: string;
  /** Optional test id override for surface-specific assertions. */
  testId?: string;
}

export const PilotContactTemplateCard: React.FC<PilotContactTemplateCardProps> = ({
  className,
  testId = 'pilot-contact-template',
}) => {
  const bi = useBi();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    const text = bi(PILOT_CONTACT_TEMPLATE_AR, PILOT_CONTACT_TEMPLATE_EN);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card
      data-testid={testId}
      className={`p-4 border-info/30 bg-info/5 ${className ?? ''}`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquare className="h-4 w-4 text-info" />
          <Bi ar="نص التواصل المعتمد — تجربة Pilot" en="Approved pilot outreach script" />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-xl"
          onClick={handleCopy}
          data-testid={`${testId}-copy`}
          aria-label={bi('نسخ النص', 'Copy script')}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 me-1.5" />
              <Bi ar="تم النسخ" en="Copied" />
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 me-1.5" />
              <Bi ar="نسخ النص" en="Copy script" />
            </>
          )}
        </Button>
      </div>
      <pre
        data-testid={`${testId}-body`}
        className="text-xs whitespace-pre-wrap font-sans text-foreground/90 leading-relaxed"
        dir="auto"
      >
        {bi(PILOT_CONTACT_TEMPLATE_AR, PILOT_CONTACT_TEMPLATE_EN)}
      </pre>
      <p className="mt-3 text-[11px] text-muted-foreground">
        <Bi
          ar="ملاحظة: نسخ يدوي فقط — لا يتم إرسال أي رسالة تلقائية للمزودين من خلال هذه الواجهة."
          en="Note: manual copy only — this surface never auto-sends messages to providers."
        />
      </p>
    </Card>
  );
};

export default PilotContactTemplateCard;