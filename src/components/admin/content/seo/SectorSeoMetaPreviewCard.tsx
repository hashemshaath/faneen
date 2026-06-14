import React from 'react';
import { Type, FileText, Tags, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type ScoreStatus = 'good' | 'short' | 'long';

const ScoreBadge: React.FC<{ status: ScoreStatus; isRTL: boolean }> = ({ status, isRTL }) => {
  const map = {
    good: { label: isRTL ? 'مثالي' : 'Optimal', cls: 'bg-success/10 text-success border-success/30' },
    short: { label: isRTL ? 'قصير' : 'Short', cls: 'bg-warning/10 text-warning border-warning/30' },
    long: { label: isRTL ? 'طويل' : 'Long', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
  } as const;
  const { label, cls } = map[status];
  return <Badge variant="outline" className={cls}>{label}</Badge>;
};

const Delta: React.FC<{ current: number; previous: number | null }> = ({ current, previous }) => {
  if (previous == null) return <span className="text-xs text-muted-foreground">—</span>;
  const diff = current - previous;
  if (diff === 0) return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Minus className="w-3 h-3" />0</span>;
  const Icon = diff > 0 ? ArrowUp : ArrowDown;
  const cls = diff > 0 ? 'text-success' : 'text-destructive';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-mono ${cls}`}>
      <Icon className="w-3 h-3" />{diff > 0 ? '+' : ''}{diff}
    </span>
  );
};

const titleScore = (len: number): ScoreStatus => (len >= 30 && len <= 60 ? 'good' : len < 30 ? 'short' : 'long');
const descScore = (len: number): ScoreStatus => (len >= 120 && len <= 160 ? 'good' : len < 120 ? 'short' : 'long');
const kwScore = (n: number): ScoreStatus => (n >= 8 && n <= 25 ? 'good' : n < 8 ? 'short' : 'long');

/**
 * SectorSeoMetaPreviewCard — preview-only render of the meta values
 * generated from `getSectorMeta`. Does not write Helmet, does not change
 * canonical/og:url, does not alter the metadata shape.
 */
export interface SectorSeoMetaPreviewCardProps {
  title: string;
  description: string;
  keywords: string;
  tagline: string | null;
  previousTitleLen: number | null;
  previousDescLen: number | null;
  previousKeywordsCount: number | null;
  isRTL: boolean;
}

export const SectorSeoMetaPreviewCard: React.FC<SectorSeoMetaPreviewCardProps> = ({
  title, description, keywords, tagline,
  previousTitleLen, previousDescLen, previousKeywordsCount, isRTL,
}) => {
  const kwArr = keywords.split(',').filter(Boolean);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Type className="w-4 h-4 text-gold" />
          {isRTL ? 'الميتا الحالية (مباشر من الكود)' : 'Current Meta (live from code)'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" />
              {isRTL ? 'العنوان' : 'Title'}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">{title.length} / 60</span>
              <ScoreBadge status={titleScore(title.length)} isRTL={isRTL} />
              <Delta current={title.length} previous={previousTitleLen} />
            </div>
          </div>
          <p className="p-2.5 rounded-lg bg-muted/50 text-sm font-medium" dir="auto">{title}</p>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              {isRTL ? 'الوصف' : 'Description'}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">{description.length} / 160</span>
              <ScoreBadge status={descScore(description.length)} isRTL={isRTL} />
              <Delta current={description.length} previous={previousDescLen} />
            </div>
          </div>
          <p className="p-2.5 rounded-lg bg-muted/50 text-sm" dir="auto">{description}</p>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Tags className="w-3.5 h-3.5" />
              {isRTL ? 'الكلمات المفتاحية' : 'Keywords'}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">
                {kwArr.length} {isRTL ? 'كلمة' : 'kw'}
              </span>
              <ScoreBadge status={kwScore(kwArr.length)} isRTL={isRTL} />
              <Delta current={kwArr.length} previous={previousKeywordsCount} />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 p-2.5 rounded-lg bg-muted/50">
            {kwArr.map((k, i) => (
              <Badge key={`${k}-${i}`} variant="secondary" className="text-xs font-normal" dir="auto">
                {k.trim()}
              </Badge>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">{isRTL ? 'الوسم' : 'Tagline'}</label>
          <p className="p-2.5 rounded-lg bg-muted/50 text-sm italic" dir="auto">{tagline}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SectorSeoMetaPreviewCard;