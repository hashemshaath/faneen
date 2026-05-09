import React from 'react';
import { MessageSquare, Search, Inbox, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';

type Variant = 'no-conversations' | 'no-results' | 'no-messages' | 'no-unread';

interface Props {
  variant?: Variant;
  onAction?: () => void;
  actionLabel?: { ar: string; en: string };
}

/**
 * Polished empty-state for the messaging center.
 * Keeps copy localized, mobile-first, and uses existing design tokens only.
 */
export const EmptyMessagesState: React.FC<Props> = ({ variant = 'no-conversations', onAction, actionLabel }) => {
  const { isRTL } = useLanguage();

  const config: Record<Variant, { icon: React.ElementType; title: { ar: string; en: string }; body: { ar: string; en: string } }> = {
    'no-conversations': {
      icon: MessageSquare,
      title: { ar: 'لا توجد محادثات بعد', en: 'No conversations yet' },
      body: {
        ar: 'ابدأ محادثة مع أي مزود أو عميل من صفحة العمل أو طلبات التواصل.',
        en: 'Start a conversation from any business page or contact request.',
      },
    },
    'no-results': {
      icon: Search,
      title: { ar: 'لا توجد نتائج للبحث', en: 'No matching results' },
      body: { ar: 'جرّب كلمات بحث مختلفة أو امسح المرشحات.', en: 'Try different keywords or clear filters.' },
    },
    'no-messages': {
      icon: Inbox,
      title: { ar: 'لا توجد رسائل بعد', en: 'No messages yet' },
      body: { ar: 'اكتب أول رسالة لبدء المحادثة.', en: 'Send the first message to start chatting.' },
    },
    'no-unread': {
      icon: BellOff,
      title: { ar: 'لا رسائل غير مقروءة', en: 'No unread messages' },
      body: { ar: 'كل رسائلك محدّثة.', en: "You're all caught up." },
    },
  };

  const { icon: Icon, title, body } = config[variant];

  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-10 sm:py-14 gap-3">
      <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <div className="space-y-1 max-w-xs">
        <h3 className="text-sm font-semibold">{isRTL ? title.ar : title.en}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{isRTL ? body.ar : body.en}</p>
      </div>
      {onAction && actionLabel && (
        <Button size="sm" variant="default" className="mt-1 h-8 text-xs" onClick={onAction}>
          {isRTL ? actionLabel.ar : actionLabel.en}
        </Button>
      )}
    </div>
  );
};

export default EmptyMessagesState;