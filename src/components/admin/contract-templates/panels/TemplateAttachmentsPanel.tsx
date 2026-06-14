import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import type { CTAttachment } from '../types';
import { ReadOnlyNotice } from './ReadOnlyNotice';

export interface TemplateAttachmentsPanelProps {
  attachments: CTAttachment[];
  isRTL: boolean;
  readOnly: boolean;
  onAdd: () => void;
  onUpdate: (a: CTAttachment) => void;
  onDelete: (id: string) => void;
}

export const TemplateAttachmentsPanel: React.FC<TemplateAttachmentsPanelProps> = ({
  attachments, isRTL, readOnly, onAdd, onUpdate, onDelete,
}) => {
  return (
    <div className="space-y-3">
      {readOnly && <ReadOnlyNotice isRTL={isRTL} />}
      {!readOnly && <Button size="sm" onClick={onAdd}><Plus className="h-4 w-4" />{isRTL ? 'إضافة مرفق' : 'Add attachment'}</Button>}
      {attachments.map((a) => (
        <Card key={a.id}><CardContent className="p-3 grid gap-2 md:grid-cols-3">
          <div>
            <Label className="text-xs">{isRTL ? 'النوع (kind)' : 'Kind'}</Label>
            <Input dir="ltr" value={a.kind} disabled={readOnly}
              onChange={(e) => onUpdate({ ...a, kind: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">{isRTL ? 'العنوان (عربي)' : 'Title (AR)'}</Label>
            <Input dir="auto" value={a.title_ar} disabled={readOnly}
              onChange={(e) => onUpdate({ ...a, title_ar: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">{isRTL ? 'العنوان (إنجليزي)' : 'Title (EN)'}</Label>
            <Input dir="ltr" value={a.title_en || ''} disabled={readOnly}
              onChange={(e) => onUpdate({ ...a, title_en: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">{isRTL ? 'رابط الملف (URL)' : 'File URL'}</Label>
            <Input dir="ltr" value={a.file_url || ''} disabled={readOnly}
              onChange={(e) => onUpdate({ ...a, file_url: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">{isRTL ? 'ترتيب الأولوية' : 'Precedence order'}</Label>
            <Input type="number" value={a.precedence_order} disabled={readOnly}
              onChange={(e) => onUpdate({ ...a, precedence_order: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <Switch checked={a.is_mandatory} disabled={readOnly}
              onCheckedChange={(v) => onUpdate({ ...a, is_mandatory: v })} />
            <span className="text-xs">{isRTL ? 'إلزامي' : 'Mandatory'}</span>
          </div>
          {!readOnly && (
            <div className="flex justify-end items-end md:col-span-2">
              <Button size="sm" variant="outline" onClick={() => onDelete(a.id)}>
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          )}
        </CardContent></Card>
      ))}
    </div>
  );
};