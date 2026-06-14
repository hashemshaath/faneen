import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { CTSection, CTClause } from '../types';
import { ReadOnlyNotice } from './ReadOnlyNotice';

export interface TemplateSectionsClausesPanelProps {
  sections: CTSection[];
  clauses: CTClause[];
  isLoading: boolean;
  isError: boolean;
  isRTL: boolean;
  readOnly: boolean;
  isAddingSection: boolean;
  onAddSection: () => void;
  onUpdateSection: (s: CTSection) => void;
  onDeleteSection: (id: string) => void;
  onReorderSection: (s: CTSection, direction: -1 | 1) => void;
  onAddClause: (sectionId: string) => void;
  onUpdateClause: (c: CTClause) => void;
  onDeleteClause: (id: string) => void;
}

export const TemplateSectionsClausesPanel: React.FC<TemplateSectionsClausesPanelProps> = ({
  sections, clauses, isLoading, isError, isRTL, readOnly, isAddingSection,
  onAddSection, onUpdateSection, onDeleteSection, onReorderSection,
  onAddClause, onUpdateClause, onDeleteClause,
}) => {
  if (isLoading) return <div className="text-sm text-muted-foreground">{isRTL ? 'جارٍ التحميل...' : 'Loading...'}</div>;
  if (isError) return <div className="text-sm text-red-600">{isRTL ? 'تعذّر تحميل الأقسام' : 'Failed to load sections'}</div>;

  return (
    <div className="space-y-4">
      {readOnly && <ReadOnlyNotice isRTL={isRTL} />}
      {!readOnly && (
        <Button size="sm" onClick={onAddSection} disabled={isAddingSection}>
          <Plus className="h-4 w-4" />{isRTL ? 'إضافة قسم' : 'Add section'}
        </Button>
      )}
      {sections.length === 0 && (
        <div className="text-sm text-muted-foreground">{isRTL ? 'لا توجد أقسام بعد.' : 'No sections yet.'}</div>
      )}
      {sections.map((s) => {
        const sectionClauses = clauses.filter((c) => c.section_id === s.id);
        return (
          <Card key={s.id} className="border">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs">{isRTL ? 'مفتاح القسم' : 'Section key'}</Label>
                  <Input dir="ltr" value={s.section_key} disabled={readOnly}
                    onChange={(e) => onUpdateSection({ ...s, section_key: e.target.value })}
                    onBlur={(e) => !readOnly && onUpdateSection({ ...s, section_key: e.target.value })} />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs">{isRTL ? 'العنوان (عربي)' : 'Title (AR)'}</Label>
                  <Input dir="auto" value={s.title_ar} disabled={readOnly}
                    onChange={(e) => onUpdateSection({ ...s, title_ar: e.target.value })} />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs">{isRTL ? 'العنوان (إنجليزي)' : 'Title (EN)'}</Label>
                  <Input dir="ltr" value={s.title_en || ''} disabled={readOnly}
                    onChange={(e) => onUpdateSection({ ...s, title_en: e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={s.is_required} disabled={readOnly}
                    onCheckedChange={(v) => onUpdateSection({ ...s, is_required: v })} />
                  <span className="text-xs">{isRTL ? 'إلزامي' : 'Required'}</span>
                </div>
                {!readOnly && (
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" onClick={() => onReorderSection(s, -1)} aria-label="Move up"><ChevronUp className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline" onClick={() => onReorderSection(s, 1)} aria-label="Expand"><ChevronDown className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline" onClick={() => onDeleteSection(s.id)} aria-label="Delete"><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </div>
                )}
              </div>

              <div className="space-y-2 ps-3 border-s-2 border-muted">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {isRTL ? `البنود (${sectionClauses.length})` : `Clauses (${sectionClauses.length})`}
                  </span>
                  {!readOnly && (
                    <Button size="sm" variant="outline" onClick={() => onAddClause(s.id)}>
                      <Plus className="h-3 w-3" />{isRTL ? 'إضافة بند' : 'Add clause'}
                    </Button>
                  )}
                </div>
                {sectionClauses.map((c) => (
                  <div key={c.id} className="rounded-md border p-2 space-y-2 bg-muted/20">
                    <Textarea dir="auto" value={c.body_ar} disabled={readOnly} rows={2}
                      placeholder={isRTL ? 'نص البند (عربي)' : 'Clause body (AR)'}
                      onChange={(e) => onUpdateClause({ ...c, body_ar: e.target.value })} />
                    <Textarea dir="ltr" value={c.body_en || ''} disabled={readOnly} rows={2}
                      placeholder="Clause body (EN)"
                      onChange={(e) => onUpdateClause({ ...c, body_en: e.target.value })} />
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <label className="flex items-center gap-1">
                        <Switch checked={c.is_mandatory} disabled={readOnly}
                          onCheckedChange={(v) => onUpdateClause({ ...c, is_mandatory: v })} />
                        {isRTL ? 'إلزامي' : 'Mandatory'}
                      </label>
                      <label className="flex items-center gap-1">
                        <Switch checked={c.is_editable_by_provider} disabled={readOnly}
                          onCheckedChange={(v) => onUpdateClause({ ...c, is_editable_by_provider: v })} />
                        {isRTL ? 'يحرّره المزود' : 'Provider-editable'}
                      </label>
                      <label className="flex items-center gap-1">
                        <Switch checked={c.is_editable_by_client} disabled={readOnly}
                          onCheckedChange={(v) => onUpdateClause({ ...c, is_editable_by_client: v })} />
                        {isRTL ? 'يحرّره العميل' : 'Client-editable'}
                      </label>
                      <Input dir="auto" className="h-8 max-w-[220px]" placeholder={isRTL ? 'مرجع قانوني' : 'Legal reference'}
                        value={c.legal_reference || ''} disabled={readOnly}
                        onChange={(e) => onUpdateClause({ ...c, legal_reference: e.target.value })} />
                      {!readOnly && (
                        <Button size="sm" variant="outline" onClick={() => onDeleteClause(c.id)}>
                          <Trash2 className="h-3 w-3 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};