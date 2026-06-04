/**
 * Inline progress card shown while images are being compressed and
 * resized in the browser, before upload begins. Bilingual, RTL-aware.
 * Pure presentational — no popups.
 */
import React from 'react';
import { Loader2, ImageDown, Wand2, CheckCircle2 } from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';
import type { CompressionStage } from '@/lib/imageCompression';

export interface CompressionStatusProps {
  stage: CompressionStage | 'uploading' | 'idle';
  percent: number;
  /** e.g. "3/8" when batch-processing. */
  counter?: string | null;
  className?: string;
}

export const CompressionStatus: React.FC<CompressionStatusProps> = ({
  stage, percent, counter, className,
}) => {
  const bi = useBi();
  if (stage === 'idle') return null;

  const label = (() => {
    switch (stage) {
      case 'validating':       return bi('جاري التحقق من الصورة…', 'Validating image…');
      case 'converting-heic':  return bi('تحويل صيغة HEIC إلى JPG…', 'Converting HEIC to JPG…');
      case 'thumbnail':        return bi('تجهيز النسخة المصغّرة…', 'Preparing thumbnail…');
      case 'medium':           return bi('تجهيز النسخة المتوسطة…', 'Preparing medium size…');
      case 'large':            return bi('تجهيز النسخة الكبيرة…', 'Preparing large size…');
      case 'done':             return bi('اكتمل الضغط — جارٍ الرفع', 'Compression done — uploading');
      case 'uploading':        return bi('جارٍ رفع الصور إلى الخادم…', 'Uploading to the server…');
      default:                 return '';
    }
  })();

  const Icon = stage === 'done'
    ? CheckCircle2
    : stage === 'uploading'
      ? ImageDown
      : stage === 'converting-heic'
        ? Wand2
        : Loader2;

  const spinning = stage !== 'done' && stage !== 'uploading' && stage !== 'converting-heic';
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5',
        'flex flex-col gap-1.5',
        className ?? '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-foreground/80">
          <Icon className={`h-4 w-4 ${spinning ? 'animate-spin text-primary' : 'text-emerald-600'}`} />
          <span className="font-medium">{label}</span>
          {counter && <span className="tech-content text-muted-foreground">({counter})</span>}
        </div>
        <span className="tech-content tabular-nums text-muted-foreground">{clamped}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/50">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};

export default CompressionStatus;