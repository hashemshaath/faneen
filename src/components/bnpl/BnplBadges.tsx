import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Check, DollarSign, Calendar, Percent, Globe, ExternalLink } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  businessId: string;
  compact?: boolean;
}

export const BnplBadges = ({ businessId, compact = false }: Props) => {
  const { isRTL, language } = useLanguage();

  // Use RPC to get public-safe BNPL links (no merchant_code/credit_limit)
  const { data: publicLinks = [] } = useQuery({
    queryKey: ['business-bnpl-public-safe', businessId],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_public_bnpl_for_business', { _business_id: businessId });
      return data ?? [];
    },
    enabled: !!businessId,
  });

  // Fetch provider details separately (public table)
  const providerIds = publicLinks.map((l: any) => l.bnpl_provider_id);
  const { data: providers = [] } = useQuery({
    queryKey: ['bnpl-providers', providerIds],
    queryFn: async () => {
      const { data } = await supabase
        .from('bnpl_providers')
        .select('*')
        .in('id', providerIds)
        .eq('is_active', true);
      return data ?? [];
    },
    enabled: providerIds.length > 0,
  });

  const linkedProviders = publicLinks.map((link: any) => ({
    ...link,
    bnpl_providers: providers.find((p: any) => p.id === link.bnpl_provider_id) || null,
  }));

  if (linkedProviders.length === 0) return null;

  if (compact) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">
            <CreditCard className="w-3.5 h-3.5" />
            <span>{isRTL ? 'تقسيط متاح' : 'Installments'}</span>
            <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4">{linkedProviders.length}</Badge>
          </button>
        </DialogTrigger>
        <BnplDialog providers={linkedProviders} />
      </Dialog>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <CreditCard className="w-4 h-4 text-primary" />
        </div>
        <h4 className="font-heading font-semibold text-sm">{isRTL ? 'خيارات التقسيط المتاحة' : 'Available Installment Options'}</h4>
      </div>
      
      <div className="grid gap-2 sm:grid-cols-2">
        {linkedProviders.map((lp: any) => {
          const p = lp.bnpl_providers;
          if (!p) return null;
          const name = isRTL ? p.name_ar : p.name_en;
          
          return (
            <Dialog key={lp.id}>
              <DialogTrigger asChild>
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/30 bg-card hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group">
                  <div className="w-10 h-10 rounded-lg border border-border/20 flex items-center justify-center bg-background overflow-hidden shrink-0">
                    {p.logo_url ? (
                      <img src={p.logo_url} alt={name} className="w-7 h-7 object-contain" loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-sm font-bold" style={{ color: p.color_hex }}>{p.name_en.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs group-hover:text-primary transition-colors">{name}</p>
                    <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mt-0.5">
                      <span>{p.installments_count} {isRTL ? 'أقساط' : 'payments'}</span>
                      <span>•</span>
                      {p.interest_rate === 0 ? (
                        <span className="text-emerald-600 font-medium">{isRTL ? 'بدون فوائد' : '0% Interest'}</span>
                      ) : (
                        <span>{p.interest_rate}%</span>
                      )}
                    </div>
                  </div>
                  <Check className="w-4 h-4 text-primary shrink-0" />
                </div>
              </DialogTrigger>
              <BnplProviderDetail provider={p} linked={lp} />
            </Dialog>
          );
        })}
      </div>
    </div>
  );
};

const BnplDialog = ({ providers }: { providers: any[] }) => {
  const { isRTL } = useLanguage();
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          {isRTL ? 'خيارات التقسيط المتاحة' : 'Available Installment Options'}
        </DialogTitle>
      </DialogHeader>
      <ScrollArea className="max-h-[60vh]">
        <div className="space-y-3 p-1">
          {providers.map((lp: any) => {
            const p = lp.bnpl_providers;
            if (!p) return null;
            return <ProviderCard key={lp.id} provider={p} linked={lp} />;
          })}
        </div>
      </ScrollArea>
    </DialogContent>
  );
};

const ProviderCard = ({ provider: p, linked }: { provider: any; linked: any }) => {
  const { isRTL } = useLanguage();
  const name = isRTL ? p.name_ar : p.name_en;
  const desc = isRTL ? p.description_ar : p.description_en;

  return (
    <div className="p-3 rounded-xl border border-border/30 bg-card space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-lg border border-border/20 flex items-center justify-center bg-background overflow-hidden shrink-0">
          {p.logo_url ? (
            <img src={p.logo_url} alt={name} className="w-8 h-8 object-contain" loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <span className="text-base font-bold" style={{ color: p.color_hex }}>{p.name_en.charAt(0)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-heading font-bold text-sm">{name}</h4>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
            <span>{p.installments_count} {isRTL ? 'قسط' : 'payments'}</span>
            <span>{p.min_amount}-{p.max_amount} {p.currency_code}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {p.interest_rate === 0 ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 text-[9px] px-1.5 py-0">{isRTL ? 'بدون فوائد' : '0%'}</Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0">{p.interest_rate}%</Badge>
          )}
          {p.website_url && (
            <a href={p.website_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      {linked.credit_limit > 0 && (
        <Badge variant="secondary" className="text-[9px] gap-1">
          <DollarSign className="w-3 h-3" />
          {isRTL ? 'حد ائتماني:' : 'Credit limit:'} {Number(linked.credit_limit).toLocaleString()} {p.currency_code}
        </Badge>
      )}
    </div>
  );
};

const BnplProviderDetail = ({ provider: p, linked }: { provider: any; linked: any }) => {
  const { isRTL } = useLanguage();
  const name = isRTL ? p.name_ar : p.name_en;
  const desc = isRTL ? p.description_ar : p.description_en;

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl border border-border/20 flex items-center justify-center bg-background overflow-hidden">
            {p.logo_url ? (
              <img src={p.logo_url} alt={name} className="w-9 h-9 object-contain" loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <span className="text-xl font-bold" style={{ color: p.color_hex }}>{p.name_en.charAt(0)}</span>
            )}
          </div>
          <div>
            <span>{name}</span>
            <p className="text-xs text-muted-foreground font-normal mt-0.5">{isRTL ? 'شريك تقسيط معتمد' : 'Authorized BNPL Partner'}</p>
          </div>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 mt-2">
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-muted/30 text-center">
            <Calendar className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{p.installments_count}</p>
            <p className="text-[10px] text-muted-foreground">{isRTL ? 'عدد الأقساط' : 'Payments'}</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 text-center">
            <Percent className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{p.interest_rate}%</p>
            <p className="text-[10px] text-muted-foreground">{isRTL ? 'نسبة الفائدة' : 'Interest Rate'}</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 text-center">
            <DollarSign className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{p.min_amount.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{isRTL ? 'الحد الأدنى' : 'Min Amount'}</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 text-center">
            <DollarSign className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{p.max_amount.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{isRTL ? 'الحد الأقصى' : 'Max Amount'}</p>
          </div>
        </div>

        {linked.credit_limit > 0 && (
          <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">{isRTL ? 'الحد الائتماني لهذا المزود' : 'Credit Limit for this Provider'}</p>
              <p className="text-sm font-bold text-primary">{Number(linked.credit_limit).toLocaleString()} {p.currency_code}</p>
            </div>
          </div>
        )}

        {p.website_url && (
          <a href={p.website_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/30 text-sm text-muted-foreground hover:text-primary hover:border-primary/30 transition-all">
            <Globe className="w-4 h-4" />
            {isRTL ? 'زيارة الموقع الرسمي' : 'Visit Official Website'}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </DialogContent>
  );
};
