import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  CreditCard, ExternalLink, Check, X, Loader2, Globe, Hash,
  DollarSign, Percent, Calendar, Shield, Sparkles, ChevronDown, ChevronUp,
} from 'lucide-react';

interface Props {
  businessId: string;
}

export const BnplProvidersManager = ({ businessId }: Props) => {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, { merchant_code: string; credit_limit: string; notes: string }>>({});

  const { data: allProviders = [], isLoading: loadingProviders } = useQuery({
    queryKey: ['bnpl-providers'],
    queryFn: async () => {
      const { data } = await supabase.from('bnpl_providers').select('*').eq('is_active', true).order('sort_order');
      return data ?? [];
    },
  });

  const { data: businessProviders = [], isLoading: loadingBP } = useQuery({
    queryKey: ['business-bnpl', businessId],
    queryFn: async () => {
      const { data } = await supabase.from('business_bnpl_providers').select('*').eq('business_id', businessId);
      return data ?? [];
    },
    enabled: !!businessId,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ providerId, enable }: { providerId: string; enable: boolean }) => {
      if (enable) {
        const { error } = await supabase.from('business_bnpl_providers').upsert({
          business_id: businessId,
          bnpl_provider_id: providerId,
          is_active: true,
        }, { onConflict: 'business_id,bnpl_provider_id' });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('business_bnpl_providers')
          .update({ is_active: false })
          .eq('business_id', businessId)
          .eq('bnpl_provider_id', providerId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-bnpl', businessId] });
      toast.success(isRTL ? 'تم التحديث' : 'Updated');
    },
    onError: () => toast.error(isRTL ? 'فشل التحديث' : 'Update failed'),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ providerId }: { providerId: string }) => {
      const d = editData[providerId];
      if (!d) return;
      const { error } = await supabase.from('business_bnpl_providers').update({
        merchant_code: d.merchant_code || null,
        credit_limit: Number(d.credit_limit) || 0,
        notes: d.notes || null,
      }).eq('business_id', businessId).eq('bnpl_provider_id', providerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-bnpl', businessId] });
      setExpandedId(null);
      toast.success(isRTL ? 'تم الحفظ' : 'Saved');
    },
    onError: () => toast.error(isRTL ? 'فشل الحفظ' : 'Save failed'),
  });

  const getLinked = (providerId: string) => businessProviders.find(bp => bp.bnpl_provider_id === providerId);

  const handleExpand = (providerId: string) => {
    const linked = getLinked(providerId);
    if (expandedId === providerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(providerId);
    setEditData(prev => ({
      ...prev,
      [providerId]: {
        merchant_code: (linked as any)?.merchant_code || '',
        credit_limit: String((linked as any)?.credit_limit || ''),
        notes: (linked as any)?.notes || '',
      },
    }));
  };

  if (loadingProviders || loadingBP) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  }

  const activeCount = businessProviders.filter(bp => bp.is_active).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm sm:text-base">{isRTL ? 'شركات التقسيط (BNPL)' : 'Installment Providers (BNPL)'}</h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{isRTL ? 'فعّل شركات التقسيط التي تقبلها' : 'Enable the BNPL providers you accept'}</p>
          </div>
        </div>
        {activeCount > 0 && (
          <Badge className="bg-primary/10 text-primary text-xs gap-1">
            <Check className="w-3 h-3" />
            {activeCount} {isRTL ? 'مفعّل' : 'active'}
          </Badge>
        )}
      </div>

      {/* Provider Cards */}
      <div className="grid gap-3">
        {allProviders.map((provider: any) => {
          const linked = getLinked(provider.id);
          const isActive = linked?.is_active === true;
          const isExpanded = expandedId === provider.id;
          const name = isRTL ? provider.name_ar : provider.name_en;
          const desc = isRTL ? provider.description_ar : provider.description_en;

          return (
            <Card key={provider.id} className={`transition-all rounded-2xl ${isActive ? 'border-primary/30 bg-primary/[0.02]' : 'border-border/30'}`}>
              <CardContent className="p-3 sm:p-4">
                {/* Main Row */}
                <div className="flex items-center gap-3">
                  {/* Logo */}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border border-border/20 flex items-center justify-center bg-background overflow-hidden shrink-0"
                    style={{ borderColor: isActive ? provider.color_hex + '30' : undefined }}>
                    {provider.logo_url ? (
                      <img src={provider.logo_url} alt={name} className="w-8 h-8 sm:w-10 sm:h-10 object-contain" loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling && ((e.target as HTMLImageElement).nextElementSibling as HTMLElement).classList.remove('hidden'); }}
                      />
                    ) : null}
                    <span className={`text-lg font-bold ${provider.logo_url ? 'hidden' : ''}`} style={{ color: provider.color_hex }}>
                      {provider.name_en.charAt(0)}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-heading font-bold text-sm">{name}</h4>
                      {isActive && <Badge className="bg-primary/10 text-primary text-[8px] px-1.5 py-0 h-4"><Check className="w-2.5 h-2.5 me-0.5" />{isRTL ? 'مفعّل' : 'Active'}</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-0.5">
                        <Calendar className="w-3 h-3" />
                        {provider.installments_count} {isRTL ? 'قسط' : 'payments'}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <DollarSign className="w-3 h-3" />
                        {provider.min_amount}-{provider.max_amount} {provider.currency_code}
                      </span>
                      {provider.interest_rate > 0 ? (
                        <span className="flex items-center gap-0.5 text-amber-600">
                          <Percent className="w-3 h-3" />{provider.interest_rate}%
                        </span>
                      ) : (
                        <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600">{isRTL ? 'بدون فوائد' : '0% Interest'}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {provider.website_url && (
                      <a href={provider.website_url} target="_blank" rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors">
                        <Globe className="w-4 h-4" />
                      </a>
                    )}
                    <Switch
                      checked={isActive}
                      onCheckedChange={(checked) => toggleMutation.mutate({ providerId: provider.id, enable: checked })}
                    />
                    {isActive && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleExpand(provider.id)}>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{desc}</p>

                {/* Expanded Settings */}
                {isExpanded && isActive && (
                  <div className="mt-3 pt-3 border-t border-border/20 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">{isRTL ? 'رمز التاجر' : 'Merchant Code'}</Label>
                        <Input
                          placeholder={isRTL ? 'MRC-XXXX' : 'MRC-XXXX'}
                          className="mt-1 h-9 text-sm"
                          value={editData[provider.id]?.merchant_code || ''}
                          onChange={e => setEditData(prev => ({ ...prev, [provider.id]: { ...prev[provider.id], merchant_code: e.target.value } }))}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{isRTL ? 'الحد الائتماني' : 'Credit Limit'}</Label>
                        <Input
                          type="number"
                          placeholder="50000"
                          className="mt-1 h-9 text-sm"
                          value={editData[provider.id]?.credit_limit || ''}
                          onChange={e => setEditData(prev => ({ ...prev, [provider.id]: { ...prev[provider.id], credit_limit: e.target.value } }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">{isRTL ? 'ملاحظات' : 'Notes'}</Label>
                      <Input
                        className="mt-1 h-9 text-sm"
                        placeholder={isRTL ? 'ملاحظات إضافية...' : 'Additional notes...'}
                        value={editData[provider.id]?.notes || ''}
                        onChange={e => setEditData(prev => ({ ...prev, [provider.id]: { ...prev[provider.id], notes: e.target.value } }))}
                      />
                    </div>
                    <Button size="sm" className="gap-1.5" onClick={() => saveMutation.mutate({ providerId: provider.id })} disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      {isRTL ? 'حفظ' : 'Save'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
