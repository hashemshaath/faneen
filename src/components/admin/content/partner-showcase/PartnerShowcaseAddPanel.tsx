import React from 'react';
import {
  Plus, Building2, Link as LinkIcon, Search as SearchIcon, X, ImageIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useBi } from '@/components/common/Bilingual';

export interface PartnerShowcaseAddDraft {
  source_type: 'business' | 'external';
  business_id: string | null;
  name_ar: string;
  name_en: string;
  logo_url: string;
  target_url: string | null;
  is_active: boolean;
}

export interface PartnerShowcaseAddBusinessOption {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  username: string | null;
  logo_url: string | null;
}

/**
 * PartnerShowcaseAddPanel — fully controlled "add partner" form. Owns no
 * state; the parent provides the business search query/results, the draft,
 * and the submit handler.
 */
export interface PartnerShowcaseAddPanelProps {
  bizQuery: string;
  onBizQueryChange: (next: string) => void;
  bizResults: ReadonlyArray<PartnerShowcaseAddBusinessOption>;
  isTaken: (id: string) => boolean;
  onPickBusiness: (option: PartnerShowcaseAddBusinessOption) => void;
  draft: PartnerShowcaseAddDraft;
  onDraftChange: (next: PartnerShowcaseAddDraft) => void;
  onUnlink: () => void;
  onSubmit: () => void;
  submitting: boolean;
}

export const PartnerShowcaseAddPanel: React.FC<PartnerShowcaseAddPanelProps> = ({
  bizQuery, onBizQueryChange, bizResults, isTaken, onPickBusiness,
  draft, onDraftChange, onUnlink, onSubmit, submitting,
}) => {
  const bi = useBi();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{bi('إضافة شريك جديد', 'Add a partner')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Building2 className="w-4 h-4" /> {bi('اختيار شركة من النظام', 'Pick a business from the system')}
          </Label>
          <div className="relative">
            <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              dir="auto"
              placeholder={bi('ابحث بالاسم أو اسم المستخدم…', 'Search by name or username…')}
              value={bizQuery}
              onChange={(e) => onBizQueryChange(e.target.value)}
              className="ps-9"
            />
          </div>
          {bizResults.length > 0 && (
            <ul className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-auto">
              {bizResults.map((b) => {
                const taken = isTaken(b.id);
                return (
                  <li key={b.id} className="flex items-center justify-between gap-3 p-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {b.logo_url ? (
                        <img src={b.logo_url} alt="" className="w-8 h-8 object-contain rounded bg-muted/50" />
                      ) : (
                        <div className="w-8 h-8 flex items-center justify-center rounded bg-muted/50">
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{b.name_ar || b.name_en || '—'}</div>
                        <div className="text-xs text-muted-foreground truncate">@{b.username ?? b.id.slice(0, 8)}</div>
                      </div>
                    </div>
                    <Button size="sm" variant={taken ? 'ghost' : 'outline'} disabled={taken} onClick={() => onPickBusiness(b)}>
                      {taken ? bi('مضافة', 'Added') : bi('اختيار', 'Pick')}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>{bi('الاسم (عربي)', 'Name (Arabic)')}</Label>
            <Input dir="auto" value={draft.name_ar} onChange={(e) => onDraftChange({ ...draft, name_ar: e.target.value })} />
          </div>
          <div>
            <Label>{bi('الاسم (إنجليزي)', 'Name (English)')}</Label>
            <Input dir="auto" value={draft.name_en} onChange={(e) => onDraftChange({ ...draft, name_en: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> {bi('رابط الشعار', 'Logo URL')}</Label>
            <Input dir="ltr" placeholder="https://…" value={draft.logo_url} onChange={(e) => onDraftChange({ ...draft, logo_url: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label className="flex items-center gap-2"><LinkIcon className="w-4 h-4" /> {bi('الرابط المستهدف', 'Target URL')}</Label>
            <Input dir="ltr" placeholder="https://… or /username" value={draft.target_url ?? ''} onChange={(e) => onDraftChange({ ...draft, target_url: e.target.value })} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {draft.source_type === 'business' && draft.business_id ? (
              <Badge variant="secondary">{bi('مرتبط بشركة في النظام', 'Linked to system business')}</Badge>
            ) : (
              <Badge variant="outline">{bi('شريك خارجي', 'External partner')}</Badge>
            )}
            {draft.business_id && (
              <Button variant="ghost" size="sm" onClick={onUnlink}>
                <X className="w-3.5 h-3.5 me-1" /> {bi('إلغاء الربط', 'Unlink')}
              </Button>
            )}
          </div>
          <Button onClick={onSubmit} disabled={submitting}>
            <Plus className="w-4 h-4 me-2" /> {bi('إضافة', 'Add')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PartnerShowcaseAddPanel;