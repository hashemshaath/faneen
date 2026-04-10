import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Sparkles } from 'lucide-react';

interface MessageTemplatesProps {
  onSelectTemplate: (content: string) => void;
  onClose: () => void;
}

export const MessageTemplates = ({ onSelectTemplate, onClose }: MessageTemplatesProps) => {
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();

  const { data: templates = [] } = useQuery({
    queryKey: ['message-templates', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('message_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      return data ?? [];
    },
    enabled: !!user,
  });

  const categoryLabels: Record<string, { ar: string; en: string }> = {
    inquiry: { ar: 'استفسارات', en: 'Inquiries' },
    quote: { ar: 'عروض أسعار', en: 'Quotes' },
    thanks: { ar: 'شكر', en: 'Thanks' },
    follow_up: { ar: 'متابعة', en: 'Follow-up' },
    maintenance: { ar: 'صيانة', en: 'Maintenance' },
    general: { ar: 'عام', en: 'General' },
  };

  const grouped = templates.reduce((acc: Record<string, any[]>, t: any) => {
    const cat = t.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <div className="absolute bottom-full mb-2 inset-x-0 bg-card rounded-xl border border-border shadow-xl max-h-80 overflow-y-auto z-50 animate-fade-in">
      <div className="p-3 border-b border-border/50 flex items-center justify-between sticky top-0 bg-card z-10">
        <h4 className="font-heading font-bold text-sm flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-accent" />
          {isRTL ? 'قوالب الرسائل' : 'Message Templates'}
        </h4>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          {isRTL ? 'إغلاق' : 'Close'}
        </button>
      </div>

      {Object.entries(grouped).map(([cat, catTemplates]) => (
        <div key={cat} className="px-3 pt-2">
          <p className="text-[10px] text-muted-foreground font-medium uppercase mb-1">
            {language === 'ar' ? categoryLabels[cat]?.ar || cat : categoryLabels[cat]?.en || cat}
          </p>
          {catTemplates.map((t: any) => {
            const title = language === 'ar' ? t.title_ar : (t.title_en || t.title_ar);
            const content = language === 'ar' ? t.content_ar : (t.content_en || t.content_ar);
            return (
              <button
                key={t.id}
                onClick={() => {
                  onSelectTemplate(content);
                  onClose();
                }}
                className="w-full text-start p-2.5 rounded-lg hover:bg-muted/50 transition-colors mb-1"
              >
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  {title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{content}</p>
              </button>
            );
          })}
        </div>
      ))}

      {templates.length === 0 && (
        <div className="p-6 text-center text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{isRTL ? 'لا توجد قوالب متاحة' : 'No templates available'}</p>
        </div>
      )}
    </div>
  );
};
