import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle, Loader2, TrendingUp, Type, Link2, Image, Hash } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SeoCheck {
  name_ar: string;
  name_en: string;
  status: 'pass' | 'warn' | 'fail';
  message_ar: string;
  message_en: string;
}

interface SeoAnalysisResult {
  score: number;
  checks: SeoCheck[];
  suggestions_ar: string[];
  suggestions_en: string[];
}

interface ContentStats {
  wordCountAr: number;
  wordCountEn: number;
  headingsCount: number;
  imagesCount: number;
  linksCount: number;
  keywordDensity: number;
  readingTime: number;
  paragraphCount: number;
}

interface Props {
  isRTL: boolean;
  analysis: SeoAnalysisResult | null;
  localScore: number;
  isAnalyzing: boolean;
  contentStats?: ContentStats;
  focusKeyword?: string;
}

const statusIcon = (s: string) => {
  if (s === 'pass') return <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />;
  if (s === 'warn') return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />;
  return <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />;
};

const scoreColor = (s: number) => {
  if (s >= 80) return 'text-green-500';
  if (s >= 50) return 'text-yellow-500';
  return 'text-red-500';
};

const scoreBg = (s: number) => {
  if (s >= 80) return 'bg-green-500';
  if (s >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
};

const progressColor = (s: number) => {
  if (s >= 80) return '[&>div]:bg-green-500';
  if (s >= 50) return '[&>div]:bg-yellow-500';
  return '[&>div]:bg-red-500';
};

export const SeoScorePanel: React.FC<Props> = ({ isRTL, analysis, localScore, isAnalyzing, contentStats, focusKeyword }) => {
  const displayScore = analysis?.score ?? localScore;

  const quickChecks = [
    {
      label: isRTL ? 'عنوان العربي' : 'AR Title',
      ok: (contentStats?.wordCountAr ?? 0) > 0,
      icon: <Type className="w-3 h-3" />,
    },
    {
      label: isRTL ? 'عنوان إنجليزي' : 'EN Title',
      ok: (contentStats?.wordCountEn ?? 0) > 0,
      icon: <Type className="w-3 h-3" />,
    },
    {
      label: isRTL ? 'كلمة مفتاحية' : 'Focus Keyword',
      ok: !!focusKeyword,
      icon: <Hash className="w-3 h-3" />,
    },
    {
      label: isRTL ? 'صور' : 'Images',
      ok: (contentStats?.imagesCount ?? 0) > 0,
      icon: <Image className="w-3 h-3" />,
    },
    {
      label: isRTL ? 'عناوين فرعية' : 'Headings',
      ok: (contentStats?.headingsCount ?? 0) >= 2,
      icon: <TrendingUp className="w-3 h-3" />,
    },
    {
      label: isRTL ? 'روابط' : 'Links',
      ok: (contentStats?.linksCount ?? 0) > 0,
      icon: <Link2 className="w-3 h-3" />,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Score Circle */}
      <div className="flex items-center justify-center">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="7" className="text-muted/20" />
            <circle cx="50" cy="50" r="42" fill="none" strokeWidth="7"
              className={scoreBg(displayScore)}
              strokeDasharray={`${(displayScore / 100) * 264} 264`}
              strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isAnalyzing ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <span className={`text-xl font-bold ${scoreColor(displayScore)}`}>{displayScore}</span>
                <span className="text-[9px] text-muted-foreground">SEO</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Badge */}
      <div className="text-center">
        <Badge variant={displayScore >= 80 ? 'default' : displayScore >= 50 ? 'secondary' : 'destructive'} className="text-[10px]">
          {displayScore >= 80 ? (isRTL ? 'ممتاز' : 'Excellent') :
           displayScore >= 50 ? (isRTL ? 'جيد' : 'Good') :
           (isRTL ? 'يحتاج تحسين' : 'Needs Work')}
        </Badge>
      </div>

      {/* Quick Checklist */}
      {contentStats && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {isRTL ? 'قائمة التحقق' : 'Checklist'}
          </p>
          {quickChecks.map((c, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px]">
              {c.ok ? <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" /> : <XCircle className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
              <span className={c.ok ? 'text-foreground' : 'text-muted-foreground'}>{c.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Content Stats */}
      {contentStats && (
        <div className="space-y-2 pt-2 border-t border-border/50">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {isRTL ? 'إحصائيات المحتوى' : 'Content Stats'}
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isRTL ? 'كلمات AR' : 'Words AR'}</span>
              <span className="font-medium">{contentStats.wordCountAr}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isRTL ? 'كلمات EN' : 'Words EN'}</span>
              <span className="font-medium">{contentStats.wordCountEn}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isRTL ? 'القراءة' : 'Read'}</span>
              <span className="font-medium">{contentStats.readingTime} {isRTL ? 'د' : 'min'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isRTL ? 'فقرات' : 'Para.'}</span>
              <span className="font-medium">{contentStats.paragraphCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isRTL ? 'عناوين' : 'H2/H3'}</span>
              <span className="font-medium">{contentStats.headingsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isRTL ? 'صور' : 'Images'}</span>
              <span className="font-medium">{contentStats.imagesCount}</span>
            </div>
          </div>

          {/* Keyword Density */}
          {focusKeyword && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">{isRTL ? 'كثافة الكلمة المفتاحية' : 'Keyword Density'}</span>
                <span className={`font-medium ${contentStats.keywordDensity >= 1 && contentStats.keywordDensity <= 3 ? 'text-green-500' : contentStats.keywordDensity > 3 ? 'text-red-500' : 'text-yellow-500'}`}>
                  {contentStats.keywordDensity.toFixed(1)}%
                </span>
              </div>
              <Progress value={Math.min(contentStats.keywordDensity * 20, 100)} className={`h-1.5 ${progressColor(contentStats.keywordDensity >= 1 && contentStats.keywordDensity <= 3 ? 80 : contentStats.keywordDensity > 3 ? 30 : 50)}`} />
              <p className="text-[9px] text-muted-foreground">
                {isRTL ? 'النطاق المثالي: 1% - 3%' : 'Ideal range: 1% – 3%'}
              </p>
            </div>
          )}

          {/* Content Length Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">{isRTL ? 'طول المحتوى' : 'Content Length'}</span>
              <span className={`font-medium ${contentStats.wordCountAr >= 300 ? 'text-green-500' : 'text-yellow-500'}`}>
                {contentStats.wordCountAr >= 300 ? (isRTL ? 'جيد' : 'Good') : (isRTL ? 'قصير' : 'Short')}
              </span>
            </div>
            <Progress value={Math.min((contentStats.wordCountAr / 300) * 100, 100)} className={`h-1.5 ${progressColor(contentStats.wordCountAr >= 300 ? 80 : 40)}`} />
            <p className="text-[9px] text-muted-foreground">
              {isRTL ? 'الحد الأدنى الموصى: 300 كلمة' : 'Recommended min: 300 words'}
            </p>
          </div>
        </div>
      )}

      {/* AI Analysis Checks */}
      {analysis?.checks && (
        <div className="space-y-1.5 pt-2 border-t border-border/50">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {isRTL ? 'تحليل AI' : 'AI Analysis'}
          </p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {analysis.checks.map((c, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] p-1.5 rounded bg-muted/30">
                {statusIcon(c.status)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium leading-tight">{isRTL ? c.name_ar : c.name_en}</p>
                  <p className="text-muted-foreground text-[9px] leading-tight">{isRTL ? c.message_ar : c.message_en}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {analysis?.suggestions_ar && analysis.suggestions_ar.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-border/50">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {isRTL ? 'اقتراحات' : 'Tips'}
          </p>
          {(isRTL ? analysis.suggestions_ar : analysis.suggestions_en).map((s, i) => (
            <p key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
              <span className="text-primary mt-0.5">•</span> {s}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
