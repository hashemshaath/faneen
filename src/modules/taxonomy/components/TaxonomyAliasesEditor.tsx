import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/i18n/LanguageContext';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createTaxonomyAlias, deleteTaxonomyAlias } from '../services';
import { normalizeTaxonomyLabel } from '../utils';
import type { TaxonomyAlias } from '../types';

interface Props {
  categoryId: string;
  aliases: TaxonomyAlias[];
  onChanged: () => void;
}

export const TaxonomyAliasesEditor: React.FC<Props> = ({ categoryId, aliases, onChanged }) => {
  const { isRTL } = useLanguage();
  const [ar, setAr] = useState('');
  const [en, setEn] = useState('');
  const [busy, setBusy] = useState(false);
  const list = aliases.filter((a) => a.category_id === categoryId);

  const add = async () => {
    if (!ar.trim()) return;
    setBusy(true);
    try {
      await createTaxonomyAlias({
        category_id: categoryId,
        alias_ar: ar.trim(),
        alias_en: en.trim() || null,
        normalized_alias: normalizeTaxonomyLabel(ar),
      });
      setAr(''); setEn('');
      onChanged();
      toast.success(isRTL ? 'تمت إضافة المرادف' : 'Alias added');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    try {
      await deleteTaxonomyAlias(id);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {list.map((a) => (
          <Badge key={a.id} variant="secondary" className="gap-1 pe-1">
            <span dir="auto">{a.alias_ar}{a.alias_en && <span className="text-muted-foreground tech-content"> / {a.alias_en}</span>}</span>
            <button onClick={() => remove(a.id)} className="ms-1 p-0.5 rounded hover:bg-muted-foreground/10" aria-label="remove"><Trash2 className="w-3 h-3" /></button>
          </Badge>
        ))}
        {list.length === 0 && <span className="text-xs text-muted-foreground">{isRTL ? 'لا توجد مرادفات.' : 'No aliases yet.'}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Input dir="auto" placeholder={isRTL ? 'مرادف عربي' : 'Arabic alias'} value={ar} onChange={(e) => setAr(e.target.value)} className="h-10 rounded-xl flex-1 min-w-[140px]" />
        <Input dir="ltr" placeholder="English alias" value={en} onChange={(e) => setEn(e.target.value)} className="h-10 rounded-xl flex-1 min-w-[140px] tech-content" />
        <Button onClick={add} disabled={busy || !ar.trim()} className="h-10 rounded-xl"><Plus className="w-4 h-4 me-1" />{isRTL ? 'إضافة' : 'Add'}</Button>
      </div>
    </div>
  );
};