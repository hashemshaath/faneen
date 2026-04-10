import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Languages, Sparkles, Search, FileText, Wand2 } from 'lucide-react';

interface Props {
  isRTL: boolean;
  onTranslate: (direction: 'ar-en' | 'en-ar') => void;
  onGenerateKeywords: () => void;
  onGenerateMeta: () => void;
  onAnalyzeSeo: () => void;
  onGenerateExcerpt: (lang: 'ar' | 'en') => void;
  onImproveContent: (lang: 'ar' | 'en') => void;
  loading: string | null;
}

export const AiToolbar: React.FC<Props> = ({
  isRTL, onTranslate, onGenerateKeywords, onGenerateMeta,
  onAnalyzeSeo, onGenerateExcerpt, onImproveContent, loading,
}) => {
  const btn = (key: string, icon: React.ReactNode, labelAr: string, labelEn: string, onClick: () => void) => (
    <Button key={key} variant="outline" size="sm" onClick={onClick} disabled={!!loading}
      className="text-xs gap-1.5 h-8 border-dashed hover:border-primary/50 hover:bg-primary/5">
      {loading === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {isRTL ? labelAr : labelEn}
    </Button>
  );

  return (
    <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-dashed border-primary/20">
      <div className="w-full flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-primary">{isRTL ? 'أدوات الذكاء الاصطناعي' : 'AI Tools'}</span>
      </div>

      {btn('translate-ar-en', <Languages className="w-3.5 h-3.5" />, 'ترجمة → EN', 'Translate → EN', () => onTranslate('ar-en'))}
      {btn('translate-en-ar', <Languages className="w-3.5 h-3.5" />, 'ترجمة → AR', 'Translate → AR', () => onTranslate('en-ar'))}
      {btn('keywords', <Search className="w-3.5 h-3.5" />, 'استخراج كلمات مفتاحية', 'Extract Keywords', onGenerateKeywords)}
      {btn('meta', <FileText className="w-3.5 h-3.5" />, 'توليد ميتا SEO', 'Generate SEO Meta', onGenerateMeta)}
      {btn('analyze', <Search className="w-3.5 h-3.5" />, 'تحليل SEO', 'Analyze SEO', onAnalyzeSeo)}
      {btn('excerpt-ar', <Wand2 className="w-3.5 h-3.5" />, 'توليد مقتطف AR', 'Generate Excerpt AR', () => onGenerateExcerpt('ar'))}
      {btn('excerpt-en', <Wand2 className="w-3.5 h-3.5" />, 'توليد مقتطف EN', 'Generate Excerpt EN', () => onGenerateExcerpt('en'))}
      {btn('improve-ar', <Sparkles className="w-3.5 h-3.5" />, 'تحسين المحتوى AR', 'Improve Content AR', () => onImproveContent('ar'))}
      {btn('improve-en', <Sparkles className="w-3.5 h-3.5" />, 'تحسين المحتوى EN', 'Improve Content EN', () => onImproveContent('en'))}
    </div>
  );
};
