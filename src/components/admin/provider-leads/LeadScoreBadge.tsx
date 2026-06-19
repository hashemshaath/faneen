import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { leadScoreTone } from './providerLeadHelpers';

interface Props {
  score: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export const LeadScoreBadge: React.FC<Props> = ({ score, size = 'sm', showLabel = false }) => {
  const { isRTL } = useLanguage();
  const tone = leadScoreTone(score);
  const cls = size === 'md' ? 'text-[11px] px-2 py-0.5' : 'text-[10px] px-1.5 py-0';
  return (
    <Badge variant="outline" className={`${tone.chip} ${cls} gap-1 tech-content`} title={isRTL ? `درجة الرصاص ${score}/100` : `Lead score ${score}/100`}>
      <Sparkles className="h-3 w-3" aria-hidden />
      {score}
      {showLabel && <span className="opacity-80">· {isRTL ? tone.label.ar : tone.label.en}</span>}
    </Badge>
  );
};

export default LeadScoreBadge;