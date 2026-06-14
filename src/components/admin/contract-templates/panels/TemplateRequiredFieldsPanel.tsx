import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { CTRequiredField } from '../types';
import { ReadOnlyNotice } from './ReadOnlyNotice';
import { JsonField } from './JsonField';

export interface TemplateRequiredFieldsPanelProps {
  fields: CTRequiredField[];
  isRTL: boolean;
  readOnly: boolean;
  onAdd: () => void;
  onUpdate: (f: CTRequiredField) => void;
  onDelete: (id: string) => void;
}

export const TemplateRequiredFieldsPanel: React.FC<TemplateRequiredFieldsPanelProps> = ({
  fields, isRTL, readOnly, onAdd, onUpdate, onDelete,
}) => {
  return (
    <div className="space-y-3">
      {readOnly && <ReadOnlyNotice isRTL={isRTL} />}
      {!readOnly && <Button size="sm" onClick={onAdd}><Plus className="h-4 w-4" />{isRTL ? 'إضافة حقل' : 'Add field'}</Button>}
      {fields.map((f) => (
        <Card key={f.id}><CardContent className="p-3 grid gap-2 md:grid-cols-3">
          <div>
            <Label className="text-xs">{isRTL ? 'مفتاح الحقل' : 'Field key'}</Label>
            <Input dir="ltr" value={f.field_key} disabled={readOnly}
              onChange={(e) => onUpdate({ ...f, field_key: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">{isRTL ? 'النوع' : 'Type'}</Label>
            <Select value={f.field_type} disabled={readOnly}
              onValueChange={(v) => onUpdate({ ...f, field_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['text','number','date','enum','boolean','json'].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{isRTL ? 'يطبّق على' : 'Applies to'}</Label>
            <Select value={f.applies_to} disabled={readOnly}
              onValueChange={(v) => onUpdate({ ...f, applies_to: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['contract','line_item','milestone','site'].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{isRTL ? 'العنوان (عربي)' : 'Label (AR)'}</Label>
            <Input dir="auto" value={f.label_ar} disabled={readOnly}
              onChange={(e) => onUpdate({ ...f, label_ar: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">{isRTL ? 'العنوان (إنجليزي)' : 'Label (EN)'}</Label>
            <Input dir="ltr" value={f.label_en || ''} disabled={readOnly}
              onChange={(e) => onUpdate({ ...f, label_en: e.target.value })} />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <Switch checked={f.is_required} disabled={readOnly}
              onCheckedChange={(v) => onUpdate({ ...f, is_required: v })} />
            <span className="text-xs">{isRTL ? 'إلزامي' : 'Required'}</span>
          </div>
          <div>
            <Label className="text-xs">{isRTL ? 'مساعدة (عربي)' : 'Help (AR)'}</Label>
            <Input dir="auto" value={f.help_ar || ''} disabled={readOnly}
              onChange={(e) => onUpdate({ ...f, help_ar: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">{isRTL ? 'مساعدة (إنجليزي)' : 'Help (EN)'}</Label>
            <Input dir="ltr" value={f.help_en || ''} disabled={readOnly}
              onChange={(e) => onUpdate({ ...f, help_en: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">enum_values JSON</Label>
            <JsonField value={f.enum_values} disabled={readOnly}
              onChange={(v) => onUpdate({ ...f, enum_values: v })} />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">validation JSON</Label>
            <JsonField value={f.validation} disabled={readOnly}
              onChange={(v) => onUpdate({ ...f, validation: v })} />
          </div>
          {!readOnly && (
            <div className="flex justify-end items-end">
              <Button size="sm" variant="outline" onClick={() => onDelete(f.id)}>
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          )}
        </CardContent></Card>
      ))}
    </div>
  );
};