import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, FileText, Languages, Loader2, X } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';

type MinimalBusiness = {
  id: string;
  name_ar: string;
  ref_id?: string | null;
  username?: string | null;
};

export interface BusinessEditPanelProps {
  isRTL: boolean;
  editingBiz: MinimalBusiness;
  contractBusinessIds: ReadonlyArray<string>;
  translationStatus: { ar: boolean; en: boolean; full: boolean };
  autoFillTranslations: () => void | Promise<void>;
  autoTranslating: boolean;
  branchCount: number;
  onClose: () => void;

  infoTab: React.ReactNode;
  ownerTab: React.ReactNode;
  contentTab: React.ReactNode;
  mediaTab: React.ReactNode;
  seoTab: React.ReactNode;
  contactTab: React.ReactNode;
  branchesTab: React.ReactNode;
  controlsTab: React.ReactNode;
  opsTab: React.ReactNode;
  footer: React.ReactNode;
}

export const BusinessEditPanel: React.FC<BusinessEditPanelProps> = ({
  isRTL,
  editingBiz,
  contractBusinessIds,
  translationStatus: tc,
  autoFillTranslations,
  autoTranslating,
  branchCount,
  onClose,
  infoTab,
  ownerTab,
  contentTab,
  mediaTab,
  seoTab,
  contactTab,
  branchesTab,
  controlsTab,
  opsTab,
  footer,
}) => (
    <div className="rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/5 to-transparent p-5 animate-in slide-in-from-top-2 duration-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
            <Edit className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base">{pickBi(isRTL, 'تعديل العمل', 'Edit Business')}: {editingBiz.name_ar}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono text-muted-foreground">{editingBiz.ref_id} · @{editingBiz.username}</span>
              {contractBusinessIds.includes(editingBiz.id) && (
                <Badge variant="outline" className="text-[9px] gap-1"><FileText className="w-2.5 h-2.5" />{pickBi(isRTL, 'مرتبط بعقود', 'Has Contracts')}</Badge>
              )}
              <Badge variant="outline" className={`text-[9px] gap-1 ${tc.full ? 'border-success/40 text-success' : 'border-warning/40 text-warning'}`}>
                <Languages className="w-2.5 h-2.5" />
                {tc.full ? (pickBi(isRTL, 'الترجمة مكتملة', 'Bilingual ready'))
                  : (isRTL ? `ينقص: ${[!tc.ar && 'AR', !tc.en && 'EN'].filter(Boolean).join(' · ')}` : `Missing: ${[!tc.ar && 'AR', !tc.en && 'EN'].filter(Boolean).join(' · ')}`)}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-xl"
            onClick={autoFillTranslations} disabled={autoTranslating}>
            {autoTranslating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
            {pickBi(isRTL, 'ترجمة تلقائية للناقص', 'Auto-translate missing')}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl" aria-label="Action"><X className="w-4 h-4" /></Button>
        </div>
      </div>
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="w-full grid grid-cols-9 h-9 rounded-xl">
          <TabsTrigger value="info" className="text-[10px] rounded-lg">{pickBi(isRTL, 'المعلومات', 'Info')}</TabsTrigger>
          <TabsTrigger value="owner" className="text-[10px] rounded-lg">{pickBi(isRTL, 'المسؤول', 'Owner')}</TabsTrigger>
          <TabsTrigger value="content" className="text-[10px] rounded-lg">{pickBi(isRTL, 'المحتوى', 'Content')}</TabsTrigger>
          <TabsTrigger value="media" className="text-[10px] rounded-lg">{pickBi(isRTL, 'الوسائط', 'Media')}</TabsTrigger>
          <TabsTrigger value="seo" className="text-[10px] rounded-lg">SEO</TabsTrigger>
          <TabsTrigger value="contact" className="text-[10px] rounded-lg">{pickBi(isRTL, 'التواصل', 'Contact')}</TabsTrigger>
          <TabsTrigger value="branches" className="text-[10px] rounded-lg">{pickBi(isRTL, 'الفروع', 'Branches')} <Badge variant="secondary" className="text-[8px] ms-0.5 h-4 px-1">{branchCount}</Badge></TabsTrigger>
          <TabsTrigger value="controls" className="text-[10px] rounded-lg">{pickBi(isRTL, 'التحكم', 'Controls')}</TabsTrigger>
          <TabsTrigger value="ops" className="text-[10px] rounded-lg">{pickBi(isRTL, 'العمليات', 'Ops')}</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 mt-3">{infoTab}</TabsContent>
        <TabsContent value="owner" className="space-y-4 mt-3">{ownerTab}</TabsContent>
        <TabsContent value="content" className="space-y-4 mt-3">{contentTab}</TabsContent>
        <TabsContent value="media" className="space-y-4 mt-3">{mediaTab}</TabsContent>
        <TabsContent value="seo" className="space-y-4 mt-3">{seoTab}</TabsContent>
        <TabsContent value="contact" className="space-y-4 mt-3">{contactTab}</TabsContent>
        <TabsContent value="branches" className="space-y-4 mt-3">{branchesTab}</TabsContent>
        <TabsContent value="controls" className="space-y-4 mt-3">{controlsTab}</TabsContent>
        <TabsContent value="ops" className="space-y-4 mt-3">{opsTab}</TabsContent>
      </Tabs>

      {footer}
    </div>
);