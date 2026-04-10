import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Languages, Sparkles, Search, FileText, Wand2, Bot } from 'lucide-react';

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
  const btnClass = "text-[10px] gap-1 h-7 px-2 border-dashed hover:border-primary/40 hover:bg-primary/5 transition-colors";
  const iconSize = "w-3 h-3";

  const Btn = ({ k, icon, ar, en, onClick }: { k: string; icon: React.ReactNode; ar: string; en: string; onClick: () => void }) => (
    <Button variant="outline" size="sm" onClick={onClick} disabled={!!loading} className={btnClass}>
      {loading === k ? <Loader2 className={`${iconSize} animate-spin`} /> : icon}
      {isRTL ? ar : en}
    </Button>
  );

  return (
    <div className="p-2.5 rounded-lg bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border border-dashed border-primary/20">
      <div className="flex items-center gap-1.5 mb-2">
        <Bot className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{isRTL ? 'أدوات الذكاء الاصطناعي' : 'AI Tools'}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {/* Translation */}
        <div className="flex gap-1 items-center">
          <Btn k="translate-ar-en" icon={<Languages className={iconSize} />} ar="AR → EN" en="AR → EN" onClick={() => onTranslate('ar-en')} />
          <Btn k="translate-en-ar" icon={<Languages className={iconSize} />} ar="EN → AR" en="EN → AR" onClick={() => onTranslate('en-ar')} />
        </div>
        <div className="w-px h-5 bg-border/60 mx-0.5" />
        {/* SEO */}
        <Btn k="keywords" icon={<Search className={iconSize} />} ar="كلمات مفتاحية" en="Keywords" onClick={onGenerateKeywords} />
        <Btn k="meta" icon={<FileText className={iconSize} />} ar="ميتا SEO" en="SEO Meta" onClick={onGenerateMeta} />
        <Btn k="analyze" icon={<Search className={iconSize} />} ar="تحليل SEO" en="SEO Analysis" onClick={onAnalyzeSeo} />
        <div className="w-px h-5 bg-border/60 mx-0.5" />
        {/* Content */}
        <Btn k="excerpt-ar" icon={<Wand2 className={iconSize} />} ar="مقتطف AR" en="Excerpt AR" onClick={() => onGenerateExcerpt('ar')} />
        <Btn k="excerpt-en" icon={<Wand2 className={iconSize} />} ar="مقتطف EN" en="Excerpt EN" onClick={() => onGenerateExcerpt('en')} />
        <Btn k="improve-ar" icon={<Sparkles className={iconSize} />} ar="تحسين AR" en="Improve AR" onClick={() => onImproveContent('ar')} />
        <Btn k="improve-en" icon={<Sparkles className={iconSize} />} ar="تحسين EN" en="Improve EN" onClick={() => onImproveContent('en')} />
      </div>
    </div>
  );
};
