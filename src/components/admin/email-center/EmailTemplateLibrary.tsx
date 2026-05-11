import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/i18n/LanguageContext';
import { Eye, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  EMAIL_TEMPLATE_CATALOG, CATEGORY_LABELS, RECIPIENT_LABELS,
  type EmailCategory, type EmailTemplateMeta,
} from '@/lib/email-center/email-template-catalog';

interface Counts { sent: number; failed: number; lastSent: string | null }

interface Props {
  onPreview: (template: EmailTemplateMeta) => void;
}

export const EmailTemplateLibrary: React.FC<Props> = ({ onPreview }) => {
  const { isRTL } = useLanguage();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<EmailCategory | 'all'>('all');

  const { data: counts } = useQuery({
    queryKey: ['email-center-template-counts'],
    queryFn: async (): Promise<Record<string, Counts>> => {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const { data } = await supabase
        .from('email_send_log')
        .select('template_name, status, created_at')
        .gte('created_at', since)
        .limit(5000);
      const map: Record<string, Counts> = {};
      for (const r of data ?? []) {
        const key = r.template_name ?? 'unknown';
        map[key] ??= { sent: 0, failed: 0, lastSent: null };
        if (r.status === 'sent') {
          map[key].sent++;
          if (!map[key].lastSent || r.created_at > map[key].lastSent!) map[key].lastSent = r.created_at;
        } else if (r.status === 'failed' || r.status === 'dlq') {
          map[key].failed++;
        }
      }
      return map;
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return EMAIL_TEMPLATE_CATALOG.filter((t) => {
      if (category !== 'all' && t.category !== category) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.displayNameAr.includes(q) ||
        t.displayNameEn.toLowerCase().includes(q)
      );
    });
  }, [search, category]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isRTL ? 'بحث في القوالب…' : 'Search templates…'}
            className="ps-10 h-11"
          />
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v as EmailCategory | 'all')}>
          <SelectTrigger className="md:w-56 h-11"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? 'كل الفئات' : 'All categories'}</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{isRTL ? v.ar : v.en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((t) => {
          const c = counts?.[t.name];
          return (
            <Card key={t.name} className="hover-lift">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{isRTL ? t.displayNameAr : t.displayNameEn}</h3>
                    <p className="text-xs text-muted-foreground tech-content truncate">{t.name}</p>
                  </div>
                  <Badge variant={t.active ? 'default' : 'secondary'} className="shrink-0 text-xs">
                    {t.active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive')}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{isRTL ? t.descriptionAr : t.descriptionEn}</p>
                <div className="flex flex-wrap gap-1 text-xs">
                  <Badge variant="outline">{isRTL ? CATEGORY_LABELS[t.category].ar : CATEGORY_LABELS[t.category].en}</Badge>
                  <Badge variant="outline">{isRTL ? RECIPIENT_LABELS[t.recipient].ar : RECIPIENT_LABELS[t.recipient].en}</Badge>
                  <Badge variant="outline" className="capitalize">{t.kind}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs tech-content border-t pt-2">
                  <div><span className="text-muted-foreground">{isRTL ? 'مُرسل' : 'Sent'}:</span> <span className="text-success font-semibold">{c?.sent ?? 0}</span></div>
                  <div><span className="text-muted-foreground">{isRTL ? 'فشل' : 'Fail'}:</span> <span className="text-destructive font-semibold">{c?.failed ?? 0}</span></div>
                  <div className="text-end text-muted-foreground truncate">
                    {c?.lastSent ? new Date(c.lastSent).toISOString().slice(0, 10) : '—'}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground truncate" title={t.trigger}>
                    <span className="opacity-70">{isRTL ? 'مُحفّز:' : 'Trigger:'}</span> {t.trigger}
                  </p>
                  <Button size="sm" variant="ghost" onClick={() => onPreview(t)} className="gap-1 shrink-0">
                    <Eye className="size-3.5" /> {isRTL ? 'معاينة' : 'Preview'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-8">{isRTL ? 'لا توجد قوالب مطابقة' : 'No matching templates'}</p>
        )}
      </div>
    </div>
  );
};