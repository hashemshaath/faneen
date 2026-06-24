import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FieldAiActions } from '@/components/blog/FieldAiActions';
import { DEFAULT_CONTRACT_TERMS_AR, DEFAULT_CONTRACT_TERMS_EN } from '@/lib/contract-default-terms';
import type { ContractForm } from './contract-form-types';

interface Props {
  isRTL: boolean;
  form: ContractForm;
  setForm: React.Dispatch<React.SetStateAction<ContractForm>>;
  /** When provided, terms are sourced from this published template version. */
  templateVersionId?: string | null;
}

export const ContractTermsSection: React.FC<Props> = ({ isRTL, form, setForm, templateVersionId }) => {
  const termsTouched = React.useRef(false);

  const { data: templateTerms } = useQuery({
    queryKey: ['contract-template-terms', templateVersionId],
    queryFn: async () => {
      if (!templateVersionId) return null;
      const { data: sections, error: sErr } = await supabase
        .from('contract_template_sections')
        .select('id, title_ar, title_en, sort_order')
        .eq('version_id', templateVersionId)
        .order('sort_order', { ascending: true });
      if (sErr || !sections?.length) return null;
      const { data: clauses, error: cErr } = await supabase
        .from('contract_template_clauses')
        .select('section_id, body_ar, body_en, sort_order')
        .in('section_id', sections.map((s) => s.id))
        .order('sort_order', { ascending: true });
      if (cErr) return null;
      const ar = sections.map((s, i) => {
        const items = (clauses ?? []).filter((c) => c.section_id === s.id).map((c) => `- ${c.body_ar}`).join('\n');
        return `${i + 1}. ${s.title_ar}\n${items}`;
      }).join('\n\n');
      const en = sections.map((s, i) => {
        const items = (clauses ?? []).filter((c) => c.section_id === s.id).map((c) => `- ${c.body_en ?? c.body_ar}`).join('\n');
        return `${i + 1}. ${s.title_en ?? s.title_ar}\n${items}`;
      }).join('\n\n');
      return { ar, en };
    },
    enabled: !!templateVersionId,
  });

  React.useEffect(() => {
    if (termsTouched.current) return;
    const ar = templateTerms?.ar ?? DEFAULT_CONTRACT_TERMS_AR;
    const en = templateTerms?.en ?? DEFAULT_CONTRACT_TERMS_EN;
    if (ar && form.terms_ar !== ar) setForm((f) => ({ ...f, terms_ar: ar, terms_en: en }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateTerms, templateVersionId]);

  const sourceLabel = templateVersionId
    ? (isRTL ? 'مصدر البنود: القالب المختار' : 'Source: selected template')
    : (isRTL ? 'مصدر البنود: نموذج افتراضي' : 'Source: default template');

  const resetToSource = () => {
    termsTouched.current = false;
    const ar = templateTerms?.ar ?? DEFAULT_CONTRACT_TERMS_AR;
    const en = templateTerms?.en ?? DEFAULT_CONTRACT_TERMS_EN;
    setForm((f) => ({ ...f, terms_ar: ar, terms_en: en }));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Label className="text-xs flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-primary" />
          {isRTL ? 'بنود العقد' : 'Contract terms'}
        </Label>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">{sourceLabel}</Badge>
          <Button type="button" size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={resetToSource}>
            <RotateCcw className="w-3 h-3" />
            {isRTL ? 'إعادة من المصدر' : 'Reset from source'}
          </Button>
          <FieldAiActions
            value={form.terms_ar}
            lang="ar"
            onImproved={(v) => { termsTouched.current = true; setForm((f) => ({ ...f, terms_ar: v })); }}
            fieldType="content"
          />
        </div>
      </div>
      <Textarea
        value={form.terms_ar}
        onChange={(e) => { termsTouched.current = true; setForm((f) => ({ ...f, terms_ar: e.target.value })); }}
        rows={10}
        className="text-xs font-mono leading-relaxed"
      />
    </div>
  );
};

export default ContractTermsSection;