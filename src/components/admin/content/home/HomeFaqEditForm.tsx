import React from 'react';
import { Loader2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export interface HomeFaqDraft {
  question_ar: string;
  question_en?: string | null;
  answer_ar: string;
  answer_en?: string | null;
  sort_order?: number | null;
  is_enabled?: boolean | null;
}

export interface HomeFaqEditFormProps {
  draft: HomeFaqDraft;
  isSaving: boolean;
  onChange: (patch: Partial<HomeFaqDraft>) => void;
  onSave: () => void;
  onCancel: () => void;
  labels: {
    questionAr: string;
    questionEn: string;
    answerAr: string;
    answerEn: string;
    order: string;
    enabled: string;
    cancel: string;
    save: string;
  };
}

/**
 * HomeFaqEditForm — presentational inline edit form. Mutations and
 * validation stay in the parent page; this component just renders fields
 * and surfaces change/save/cancel intents.
 */
export const HomeFaqEditForm: React.FC<HomeFaqEditFormProps> = ({
  draft,
  isSaving,
  onChange,
  onSave,
  onCancel,
  labels,
}) => (
  <div className="space-y-3 border-t border-border/60 pt-3 mt-3">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <Label>{labels.questionAr} *</Label>
        <Input
          dir="auto"
          value={draft.question_ar}
          onChange={(e) => onChange({ question_ar: e.target.value })}
          maxLength={180}
        />
        <div className="text-[10px] text-muted-foreground mt-1">{draft.question_ar.length}/180</div>
      </div>
      <div>
        <Label>{labels.questionEn}</Label>
        <Input
          dir="auto"
          value={draft.question_en ?? ''}
          onChange={(e) => onChange({ question_en: e.target.value })}
          maxLength={180}
        />
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <Label>{labels.answerAr} *</Label>
        <Textarea
          dir="auto"
          rows={3}
          value={draft.answer_ar}
          onChange={(e) => onChange({ answer_ar: e.target.value })}
          maxLength={1200}
        />
        <div className="text-[10px] text-muted-foreground mt-1">{draft.answer_ar.length}/1200</div>
      </div>
      <div>
        <Label>{labels.answerEn}</Label>
        <Textarea
          dir="auto"
          rows={3}
          value={draft.answer_en ?? ''}
          onChange={(e) => onChange({ answer_en: e.target.value })}
          maxLength={1200}
        />
      </div>
    </div>
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <Label className="text-xs">{labels.order}</Label>
        <Input
          type="number"
          className="h-9 w-24"
          value={draft.sort_order ?? 0}
          onChange={(e) => onChange({ sort_order: Number(e.target.value) })}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={draft.is_enabled ?? true}
          onCheckedChange={(v) => onChange({ is_enabled: v })}
        />
        <span className="text-xs">{labels.enabled}</span>
      </div>
      <div className="ms-auto flex gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4 me-1" />{labels.cancel}
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Save className="w-4 h-4 me-1" />}
          {labels.save}
        </Button>
      </div>
    </div>
  </div>
);

export default HomeFaqEditForm;