import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Tag, Eye } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface Props {
  title: string;
  content: string;
  excerpt: string;
  coverImage: string;
  category: string;
  tags: string;
  focusKeyword: string;
  readingTime: number;
  isRTL: boolean;
  lang: 'ar' | 'en';
}

export const ArticlePreview: React.FC<Props> = ({
  title, content, excerpt, coverImage, category, tags, focusKeyword, readingTime, isRTL, lang,
}) => {
  const htmlContent = useMemo(() => {
    if (!content) return '';
    try {
      return marked.parse(content, { async: false }) as string;
    } catch {
      return content;
    }
  }, [content]);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <div className="max-w-3xl mx-auto" dir={dir}>
      {/* Cover */}
      {coverImage && (
        <div className="rounded-xl overflow-hidden mb-6 aspect-[2/1]">
          <img src={coverImage} alt={title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-muted-foreground">
        <Badge variant="secondary" className="text-[10px]">{category}</Badge>
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{readingTime} {isRTL ? 'دقائق قراءة' : 'min read'}</span>
        {focusKeyword && (
          <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{focusKeyword}</span>
        )}
      </div>

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-heading font-bold leading-tight mb-4">{title || (isRTL ? 'عنوان المقال' : 'Article Title')}</h1>

      {/* Excerpt */}
      {excerpt && (
        <p className="text-base text-muted-foreground leading-relaxed mb-6 pb-6 border-b border-border/50 italic">
          {excerpt}
        </p>
      )}

      {/* Content */}
      <div
        className="prose prose-sm sm:prose-base max-w-none dark:prose-invert
          prose-headings:font-heading prose-headings:font-bold
          prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3
          prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
          prose-p:leading-[1.85] prose-p:mb-4
          prose-li:leading-[1.75]
          prose-img:rounded-xl prose-img:shadow-md
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          prose-blockquote:border-primary/30 prose-blockquote:bg-muted/20 prose-blockquote:py-1 prose-blockquote:rounded-e-lg
          prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
          prose-table:border prose-table:border-border
          prose-th:bg-muted/50 prose-th:p-2 prose-td:p-2 prose-td:border prose-td:border-border"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent || `<p class="text-muted-foreground">${isRTL ? 'لا يوجد محتوى بعد...' : 'No content yet...'}</p>`) }}
      />

      {/* Tags */}
      {tags && (
        <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-border/50">
          {tags.split(',').filter(t => t.trim()).map((t, i) => (
            <Badge key={i} variant="outline" className="text-[10px]">#{t.trim()}</Badge>
          ))}
        </div>
      )}
    </div>
  );
};
