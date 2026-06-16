/**
 * Tabs container for the business onboarding details step.
 *
 * Splits the long single form into three focused tabs:
 *   1. الهوية / Identity      — names, username, unified number, email, CR
 *   2. التصنيف / Classification — central taxonomy (entity/primary/secondary)
 *   3. العنوان / Address      — National Address + map + branches
 *
 * The tabs are presentation-only: each tab renders children passed by the
 * parent (Onboarding.tsx still owns the state and validation). A small
 * completeness indicator helps the user track which tab still needs input.
 */
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Check, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

export type BusinessTabKey = 'identity' | 'classification' | 'address';

interface TabState { complete: boolean }

interface Props {
  active: BusinessTabKey;
  onChange: (key: BusinessTabKey) => void;
  identity: React.ReactNode;
  classification: React.ReactNode;
  address: React.ReactNode;
  states: Record<BusinessTabKey, TabState>;
}

const tt = (rtl: boolean, ar: string, en: string) => (rtl ? ar : en);

export const BusinessDetailsTabs: React.FC<Props> = ({
  active, onChange, identity, classification, address, states,
}) => {
  const { isRTL } = useLanguage();

  const trigger = (key: BusinessTabKey, ar: string, en: string) => {
    const s = states[key];
    return (
      <TabsTrigger value={key} className="flex-1 gap-1.5 text-xs sm:text-sm">
        {s.complete
          ? <Check className="w-3.5 h-3.5 text-emerald-600" />
          : <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />}
        <span>{tt(isRTL, ar, en)}</span>
        {!s.complete && (
          <Badge variant="outline" className="text-[9px] px-1 h-4">
            {tt(isRTL, 'غير مكتمل', 'incomplete')}
          </Badge>
        )}
      </TabsTrigger>
    );
  };

  return (
    <Tabs value={active} onValueChange={(v) => onChange(v as BusinessTabKey)} className="w-full">
      <TabsList className="w-full grid grid-cols-3 h-auto p-1">
        {trigger('identity', '١. الهوية', '1. Identity')}
        {trigger('classification', '٢. التصنيف', '2. Classification')}
        {trigger('address', '٣. العنوان والفروع', '3. Address & Branches')}
      </TabsList>
      <TabsContent value="identity" className="mt-4 space-y-4">{identity}</TabsContent>
      <TabsContent value="classification" className="mt-4">{classification}</TabsContent>
      <TabsContent value="address" className="mt-4">{address}</TabsContent>
    </Tabs>
  );
};

export default BusinessDetailsTabs;