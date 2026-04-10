import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';

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

interface Props {
  isRTL: boolean;
  analysis: SeoAnalysisResult | null;
  localScore: number;
  isAnalyzing: boolean;
}

const statusIcon = (s: string) => {
  if (s === 'pass') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (s === 'warn') return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  return <XCircle className="w-4 h-4 text-red-500" />;
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

export const SeoScorePanel: React.FC<Props> = ({ isRTL, analysis, localScore, isAnalyzing }) => {
  const displayScore = analysis?.score ?? localScore;

  return (
    <div className="space-y-3">
      {/* Score Circle */}
      <div className="flex items-center justify-center">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
            <circle cx="50" cy="50" r="42" fill="none" strokeWidth="6"
              className={scoreBg(displayScore)}
              strokeDasharray={`${(displayScore / 100) * 264} 264`}
              strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isAnalyzing ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <span className={`text-2xl font-bold ${scoreColor(displayScore)}`}>{displayScore}</span>
                <span className="text-[10px] text-muted-foreground">SEO</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Badge */}
      <div className="text-center">
        <Badge variant={displayScore >= 80 ? 'default' : displayScore >= 50 ? 'secondary' : 'destructive'} className="text-xs">
          {displayScore >= 80 ? (isRTL ? 'ممتاز' : 'Excellent') :
           displayScore >= 50 ? (isRTL ? 'جيد' : 'Good') :
           (isRTL ? 'يحتاج تحسين' : 'Needs Work')}
        </Badge>
      </div>

      {/* Checks */}
      {analysis?.checks && (
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {analysis.checks.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-xs p-1.5 rounded bg-muted/30">
              {statusIcon(c.status)}
              <div className="flex-1 min-w-0">
                <p className="font-medium">{isRTL ? c.name_ar : c.name_en}</p>
                <p className="text-muted-foreground text-[10px]">{isRTL ? c.message_ar : c.message_en}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {analysis?.suggestions_ar && analysis.suggestions_ar.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold">{isRTL ? 'اقتراحات التحسين' : 'Improvement Tips'}</p>
          {(isRTL ? analysis.suggestions_ar : analysis.suggestions_en).map((s, i) => (
            <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
              <span className="text-primary mt-0.5">•</span> {s}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
