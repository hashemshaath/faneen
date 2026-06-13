import React from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ImageUpload } from '@/components/ui/image-upload';
import { Image as ImageIcon, X } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import type { AdminEditBusinessFormState } from '@/pages/admin/adminBusinesses.types';
import type { EditPanelPortfolioImage, SetEditFieldFn } from './types';

type Props = {
  editForm: AdminEditBusinessFormState;
  setField: SetEditFieldFn;
  isRTL: boolean;
  portfolioData: ReadonlyArray<EditPanelPortfolioImage>;
  onAddPortfolio: (url: string) => void;
  onDeletePortfolio: (id: string) => void;
};

export const BusinessMediaSection: React.FC<Props> = ({
  editForm,
  setField,
  isRTL,
  portfolioData,
  onAddPortfolio,
  onDeletePortfolio,
}) => (
  <>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <Label className="text-xs font-semibold mb-2 block">{pickBi(isRTL, 'الشعار', 'Logo')}</Label>
        <ImageUpload
          bucket="business-assets"
          value={editForm.logo_url}
          onChange={(url) => setField('logo_url', url)}
          onRemove={() => {
            setField('logo_url', '');
            setField('logo_image_asset_id', null);
            setField('logo_image_variants', null);
          }}
          pipeline="business"
          businessKind="logo"
          onUploadedMeta={(meta) => {
            setField('logo_image_asset_id', meta.imageAssetId ?? null);
            setField('logo_image_variants', meta.variants ?? null);
          }}
          aspectRatio="square"
          placeholder={pickBi(isRTL, 'رفع الشعار', 'Upload logo')}
        />
      </div>
      <div>
        <Label className="text-xs font-semibold mb-2 block">{pickBi(isRTL, 'صورة الغلاف', 'Cover Image')}</Label>
        <ImageUpload
          bucket="business-assets"
          value={editForm.cover_url}
          onChange={(url) => setField('cover_url', url)}
          onRemove={() => {
            setField('cover_url', '');
            setField('cover_image_asset_id', null);
            setField('cover_image_variants', null);
          }}
          pipeline="business"
          businessKind="cover"
          onUploadedMeta={(meta) => {
            setField('cover_image_asset_id', meta.imageAssetId ?? null);
            setField('cover_image_variants', meta.variants ?? null);
          }}
          placeholder={pickBi(isRTL, 'رفع صورة الغلاف', 'Upload cover')}
        />
      </div>
    </div>
    <Separator />
    <div>
      <Label className="text-xs font-semibold mb-2 flex items-center gap-1">
        <ImageIcon className="w-3 h-3" /> {pickBi(isRTL, 'معرض صور الأعمال', 'Work Gallery')}
        <Badge variant="secondary" className="text-[9px] ms-1">{portfolioData.length}</Badge>
      </Label>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {portfolioData.map((item) => (
          <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden border border-border/50 group">
            <img src={item.media_url} alt={pickBi(isRTL, 'صورة من معرض الأعمال', 'Portfolio image')} className="w-full h-full object-cover" loading="lazy" decoding="async" />
            <button
              type="button"
              onClick={() => {
                if (confirm(pickBi(isRTL, 'حذف هذه الصورة؟', 'Delete this image?'))) onDeletePortfolio(item.id);
              }}
              className="absolute top-1 end-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Delete"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <div className="aspect-square">
          <ImageUpload
            bucket="portfolio-images"
            folder="admin"
            aspectRatio="square"
            onChange={(url) => onAddPortfolio(url)}
            placeholder={pickBi(isRTL, 'إضافة صورة', 'Add image')}
          />
        </div>
      </div>
    </div>
  </>
);