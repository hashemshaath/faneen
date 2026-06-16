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
import { Check, Building2, Tags, MapPin } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

export type BusinessTabKey = 'identity' | 'classification' | 'address';

interface TabState {
  complete: boolean;
  /** 0-100 — controls the thin progress bar under the tab label. */
  progress?: number;
}

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

  const ICONS: Record<BusinessTabKey, typeof Building2> = {
    identity: Building2,
    classification: Tags,
    address: MapPin,
  };

  const trigger = (
    key: BusinessTabKey,
    ar: string,
    en: string,
    num: string,
  ) => {
    const s = states[key];
    const Icon = ICONS[key];
    const pct = Math.max(0, Math.min(100, s.progress ?? (s.complete ? 100 : 0)));
    return (
      <TabsTrigger
        value={key}
        className="flex-1 flex-col items-stretch gap-1 px-2 py-2 h-auto data-[state=active]:bg-background data-[state=active]:shadow-sm"
      >
        <span className="flex items-center justify-center gap-1.5 text-xs sm:text-sm">
          <span
            className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold transition-colors ${
              s.complete
                ? 'bg-emerald-500 text-white'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {s.complete ? <Check className="w-3 h-3" /> : num}
          </span>
          <Icon className="w-3.5 h-3.5 opacity-70" />
          <span className="font-medium">{tt(isRTL, ar, en)}</span>
        </span>
        <span className="h-1 w-full rounded-full bg-muted overflow-hidden">
          <span
            className={`block h-full transition-all duration-500 ${
              s.complete ? 'bg-emerald-500' : 'bg-gold'
            }`}
            style={{ width: `${pct}%` }}
          />
        </span>
      </TabsTrigger>
    );
  };

  return (
    <Tabs value={active} onValueChange={(v) => onChange(v as BusinessTabKey)} className="w-full">
      <TabsList className="w-full grid grid-cols-3 h-auto p-1 gap-1 bg-muted/40 rounded-xl">
        {trigger('identity', 'الهوية', 'Identity', '1')}
        {trigger('classification', 'التصنيف', 'Classification', '2')}
        {trigger('address', 'العنوان والفروع', 'Address', '3')}
      </TabsList>
      <TabsContent value="identity" className="mt-4 space-y-4 animate-fade-in">{identity}</TabsContent>
      <TabsContent value="classification" className="mt-4 animate-fade-in">{classification}</TabsContent>
      <TabsContent value="address" className="mt-4 animate-fade-in">{address}</TabsContent>
    </Tabs>
  );
};

export default BusinessDetailsTabs;