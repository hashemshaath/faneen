import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, FileText, Languages, Loader2, X } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';

import {
  BusinessPublicVisibilityCard,
  type PublicVisibilityProbeRow,
} from '@/components/admin/businesses/BusinessPublicVisibilityCard';
import { BusinessBasicInfoSection } from '@/components/admin/businesses/edit/BusinessBasicInfoSection';
import { BusinessContentSection } from '@/components/admin/businesses/edit/BusinessContentSection';
import { BusinessMediaSection } from '@/components/admin/businesses/edit/BusinessMediaSection';
import { BusinessSeoSection } from '@/components/admin/businesses/edit/BusinessSeoSection';
import { BusinessContactSection } from '@/components/admin/businesses/edit/BusinessContactSection';
import { BusinessEditActionsFooter } from '@/components/admin/businesses/edit/BusinessEditActionsFooter';
import { BusinessBranchesSection } from '@/components/admin/businesses/branches/BusinessBranchesSection';
import { BusinessControlsSection } from '@/components/admin/businesses/sections/BusinessControlsSection';
import { BusinessOperationsSection } from '@/components/admin/businesses/sections/BusinessOperationsSection';
import { BusinessOwnerSectionShell } from '@/components/admin/businesses/sections/BusinessOwnerSectionShell';

type BasicSectionProps = React.ComponentProps<typeof BusinessBasicInfoSection>;
type MediaSectionProps = React.ComponentProps<typeof BusinessMediaSection>;
type SeoSectionProps = React.ComponentProps<typeof BusinessSeoSection>;
type ContactSectionProps = React.ComponentProps<typeof BusinessContactSection>;
type BranchesSectionProps = React.ComponentProps<typeof BusinessBranchesSection>;
type ControlsSectionProps = React.ComponentProps<typeof BusinessControlsSection>;

type EditingBusiness = BasicSectionProps['editingBiz'];
type EditFormState = BasicSectionProps['editForm'];
type SetField = BasicSectionProps['setField'];

export interface BusinessEditPanelProps {
  isRTL: boolean;
  language: string;
  editingBiz: EditingBusiness;
  editForm: EditFormState;
  setField: SetField;

  contractBusinessIds: ReadonlyArray<string>;
  translationCompleteness: (b: EditFormState) => { ar: boolean; en: boolean; full: boolean };

  autoFillTranslations: () => void | Promise<void>;
  autoTranslating: boolean;

  publicVisibilityProbe: PublicVisibilityProbeRow | null;
  publicUsernameDuplicateCount: number;
  isPublishing: boolean;
  onPublish: React.ComponentProps<typeof BusinessPublicVisibilityCard>['onPublish'];

  ownerRef: BasicSectionProps['ownerRef'];
  onTaxonomySaved: () => void;

  portfolioData: MediaSectionProps['portfolioData'];
  onAddPortfolio: MediaSectionProps['onAddPortfolio'];
  onDeletePortfolio: MediaSectionProps['onDeletePortfolio'];

  editCityName: SeoSectionProps['cityName'];

  allServices: ContactSectionProps['registeredServices'];
  onManageServices: () => void;

  branches: BranchesSectionProps['branches'];
  branchForm: BranchesSectionProps['branchForm'];
  setBranchForm: BranchesSectionProps['setBranchForm'];
  editingBranchId: BranchesSectionProps['editingBranchId'];
  setEditingBranchId: BranchesSectionProps['setEditingBranchId'];
  branchTranslating: BranchesSectionProps['branchTranslating'];
  onTranslateBranch: BranchesSectionProps['onTranslate'];
  countries: BranchesSectionProps['countries'];
  onToggleBranchActive: BranchesSectionProps['onToggleActive'];
  onEditBranch: BranchesSectionProps['onEdit'];
  onDeleteBranch: BranchesSectionProps['onDelete'];
  onSaveBranch: BranchesSectionProps['onSave'];
  savingBranch: BranchesSectionProps['saving'];
  emptyBranch: BranchesSectionProps['emptyBranch'];
  mainContact: BranchesSectionProps['mainContact'];
  onApplyHoursToAllBranches: BranchesSectionProps['onApplyHoursToAllBranches'];
  applyingHoursToAllBranches: BranchesSectionProps['applyingHoursToAllBranches'];

  tiers: ControlsSectionProps['tiers'];

  canSave: boolean;
  savingEdit: boolean;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

export const BusinessEditPanel: React.FC<BusinessEditPanelProps> = ({
  isRTL,
  language,
  editingBiz,
  editForm,
  setField,
  contractBusinessIds,
  translationCompleteness,
  autoFillTranslations,
  autoTranslating,
  publicVisibilityProbe,
  publicUsernameDuplicateCount,
  isPublishing,
  onPublish,
  ownerRef,
  onTaxonomySaved,
  portfolioData,
  onAddPortfolio,
  onDeletePortfolio,
  editCityName,
  allServices,
  onManageServices,
  branches,
  branchForm,
  setBranchForm,
  editingBranchId,
  setEditingBranchId,
  branchTranslating,
  onTranslateBranch,
  countries,
  onToggleBranchActive,
  onEditBranch,
  onDeleteBranch,
  onSaveBranch,
  savingBranch,
  emptyBranch,
  mainContact,
  onApplyHoursToAllBranches,
  applyingHoursToAllBranches,
  tiers,
  canSave,
  savingEdit,
  onSaveEdit,
  onCancelEdit,
}) => {
  const tc = translationCompleteness(editForm);
  return (
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
          <Button variant="ghost" size="icon" onClick={onCancelEdit} className="rounded-xl" aria-label="Action"><X className="w-4 h-4" /></Button>
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
          <TabsTrigger value="branches" className="text-[10px] rounded-lg">{pickBi(isRTL, 'الفروع', 'Branches')} <Badge variant="secondary" className="text-[8px] ms-0.5 h-4 px-1">{branches.length}</Badge></TabsTrigger>
          <TabsTrigger value="controls" className="text-[10px] rounded-lg">{pickBi(isRTL, 'التحكم', 'Controls')}</TabsTrigger>
          <TabsTrigger value="ops" className="text-[10px] rounded-lg">{pickBi(isRTL, 'العمليات', 'Ops')}</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 mt-3">
          <BusinessPublicVisibilityCard
            business={editingBiz}
            publicProbe={publicVisibilityProbe}
            duplicateCount={publicUsernameDuplicateCount}
            isRTL={isRTL}
            isPublishing={isPublishing}
            onPublish={onPublish}
          />
          <BusinessBasicInfoSection
            editForm={editForm}
            setField={setField}
            isRTL={isRTL}
            editingBiz={editingBiz}
            ownerRef={ownerRef}
            onTaxonomySaved={onTaxonomySaved}
          />
        </TabsContent>

        <TabsContent value="owner" className="space-y-4 mt-3">
          <BusinessOwnerSectionShell
            businessId={editingBiz.id}
            businessRef={editingBiz.ref_id ?? null}
            ownerUserId={editingBiz.user_id}
            isRTL={isRTL}
            onOwnerReassigned={onCancelEdit}
          />
        </TabsContent>

        <TabsContent value="content" className="space-y-4 mt-3">
          <BusinessContentSection editForm={editForm} setField={setField} isRTL={isRTL} />
        </TabsContent>

        <TabsContent value="media" className="space-y-4 mt-3">
          <BusinessMediaSection
            editForm={editForm}
            setField={setField}
            isRTL={isRTL}
            portfolioData={portfolioData}
            onAddPortfolio={onAddPortfolio}
            onDeletePortfolio={onDeletePortfolio}
          />
        </TabsContent>

        <TabsContent value="seo" className="space-y-4 mt-3">
          <BusinessSeoSection
            editForm={editForm}
            setField={setField}
            isRTL={isRTL}
            editingBiz={editingBiz}
            cityName={editCityName}
          />
        </TabsContent>

        <TabsContent value="contact" className="space-y-4 mt-3">
          <BusinessContactSection
            editForm={editForm}
            setField={setField}
            isRTL={isRTL}
            language={language}
            editingBiz={editingBiz}
            registeredServices={allServices}
            onManageServices={onManageServices}
          />
        </TabsContent>

        <TabsContent value="branches" className="space-y-4 mt-3">
          <BusinessBranchesSection
            isRTL={isRTL}
            language={language as 'ar' | 'en'}
            branches={branches}
            branchForm={branchForm}
            setBranchForm={setBranchForm}
            editingBranchId={editingBranchId}
            setEditingBranchId={setEditingBranchId}
            branchTranslating={branchTranslating}
            onTranslate={onTranslateBranch}
            countries={countries}
            onToggleActive={onToggleBranchActive}
            onEdit={onEditBranch}
            onDelete={onDeleteBranch}
            onSave={onSaveBranch}
            saving={savingBranch}
            emptyBranch={emptyBranch}
            mainContact={mainContact}
            onApplyHoursToAllBranches={onApplyHoursToAllBranches}
            applyingHoursToAllBranches={applyingHoursToAllBranches}
          />
        </TabsContent>

        <TabsContent value="controls" className="space-y-4 mt-3">
          <BusinessControlsSection
            editForm={editForm}
            setField={setField}
            isRTL={isRTL}
            language={language as 'ar' | 'en'}
            tiers={tiers}
          />
        </TabsContent>

        <TabsContent value="ops" className="space-y-4 mt-3">
          <BusinessOperationsSection businessId={editingBiz.id} />
        </TabsContent>
      </Tabs>

      <BusinessEditActionsFooter
        isRTL={isRTL}
        canSave={canSave}
        saving={savingEdit}
        onSave={onSaveEdit}
        onCancel={onCancelEdit}
      />
    </div>
  );
};