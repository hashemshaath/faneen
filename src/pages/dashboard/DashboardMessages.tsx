import React, { useState, useEffect, useRef, useMemo, useCallback, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  MessageSquare, Send, Search, Check, CheckCheck, ArrowLeft, ArrowRight,
  Paperclip, Image as ImageIcon, FileText, X, Download, Loader2, Eye, ExternalLink,
  Upload, Sparkles, Reply, MoreVertical, Users, Clock, Archive, Smile, Pin,
  Star, Trash2, Copy, ChevronDown, Phone, Video, Info, StarOff, Hash,
  BarChart3, MessageCircle, TrendingUp, Zap, Shield, Forward, Mic, MicOff,
  Volume2, VolumeX, Bell, BellOff, AlertCircle, UserPlus, AtSign, Link2,
  Bookmark, BookmarkCheck, Filter, LayoutList, Calendar, Globe,
  Timer, Tag, Palette, FileDown, ChevronUp,
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday, differenceInMinutes } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { MessageTemplates } from '@/components/messages/MessageTemplates';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const EMOJI_QUICK = ['👍', '❤️', '😊', '👏', '🙏', '✅', '🎉', '💯', '🔥', '😂', '😍', '🤝', '💪', '👀', '🙌', '🥳', '🤔', '💬'];
const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const CONV_LABELS = [
  { key: 'none', color: '', label_ar: 'بدون تصنيف', label_en: 'No label' },
  { key: 'new_client', color: 'bg-emerald-500', label_ar: 'عميل جديد', label_en: 'New Client' },
  { key: 'follow_up', color: 'bg-amber-500', label_ar: 'متابعة', label_en: 'Follow-up' },
  { key: 'important', color: 'bg-destructive', label_ar: 'مهم', label_en: 'Important' },
  { key: 'completed', color: 'bg-blue-500', label_ar: 'مكتمل', label_en: 'Completed' },
  { key: 'vip', color: 'bg-purple-500', label_ar: 'VIP', label_en: 'VIP' },
  { key: 'support', color: 'bg-cyan-500', label_ar: 'دعم فني', label_en: 'Support' },
];

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getDateLabel = (dateStr: string, lang: string) => {
  const date = new Date(dateStr);
  const locale = lang === 'ar' ? ar : enUS;
  if (isToday(date)) return lang === 'ar' ? 'اليوم' : 'Today';
  if (isYesterday(date)) return lang === 'ar' ? 'أمس' : 'Yesterday';
  return format(date, 'EEEE, d MMMM yyyy', { locale });
};

/* ─── Conversation Skeleton ─── */
const ConversationSkeleton = () => (
  <div className="space-y-0.5">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center gap-2.5 p-3">
        <Skeleton className="w-11 h-11 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="flex justify-between"><Skeleton className="h-3.5 w-24" /><Skeleton className="h-2.5 w-10" /></div>
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
    ))}
  </div>
);

/* ─── Typing Indicator ─── */
const TypingIndicator = React.memo(({ isRTL }: { isRTL: boolean }) => (
  <div className="flex justify-start mb-1.5 animate-in fade-in-0 duration-300">
    <div className="bg-card border border-border/30 rounded-2xl rounded-es-md px-4 py-2.5 shadow-sm">
      <div className="flex items-center gap-1.5">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-[10px] text-muted-foreground ms-1">{isRTL ? 'يكتب...' : 'typing...'}</span>
      </div>
    </div>
  </div>
));
TypingIndicator.displayName = 'TypingIndicator';

/* ─── Attachment Preview (memo) ─── */
const AttachmentPreview = React.memo(({ url, type, name }: { url: string; type: string; name?: string }) => {
  const [showPdf, setShowPdf] = React.useState(false);
  const isImage = IMAGE_TYPES.some(t => url.toLowerCase().includes(t.split('/')[1]) || type === t);
  const inferredImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
  const isPdf = /\.pdf(\?|$)/i.test(url) || type === 'application/pdf';

  if (isImage || inferredImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2 group/img">
        <div className="relative overflow-hidden rounded-xl border border-border/20 shadow-sm">
          <img src={url} alt={name || 'attachment'} className="max-w-[260px] max-h-[220px] object-cover transition-transform duration-300 group-hover/img:scale-105" loading="lazy" />
          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors flex items-center justify-center">
            <Eye className="w-5 h-5 text-white opacity-0 group-hover/img:opacity-100 transition-opacity drop-shadow-lg" />
          </div>
        </div>
      </a>
    );
  }
  if (isPdf) {
    return (
      <div className="mt-2 max-w-[260px]">
        {showPdf && (
          <div className="mb-2 rounded-xl overflow-hidden border border-border/20 bg-background shadow-sm">
            <iframe src={`${url}#toolbar=0&navpanes=0`} className="w-full h-[240px]" title={name || 'PDF'} />
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowPdf(!showPdf)} className="flex items-center gap-2 p-2.5 rounded-xl bg-background/80 border border-border/20 hover:bg-muted/50 hover:border-border/40 transition-all flex-1 min-w-0 shadow-sm">
            <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5 text-destructive" />
            </div>
            <span className="text-[11px] truncate flex-1 text-start font-medium">{name || 'PDF'}</span>
            <Eye className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </button>
          <a href={url} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-xl bg-background/80 border border-border/20 hover:bg-muted/50 transition-all shrink-0 shadow-sm">
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 mt-2 p-2.5 rounded-xl bg-background/80 border border-border/20 hover:bg-muted/50 hover:border-border/40 transition-all max-w-[220px] shadow-sm">
      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <span className="text-[11px] truncate flex-1 font-medium">{name || 'ملف مرفق'}</span>
      <Download className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    </a>
  );
});
AttachmentPreview.displayName = 'AttachmentPreview';

/* ─── Conversation Item (memo) ─── */
const ConversationItem = React.memo(({ conv, isSelected, unread, isRTL, language, isSuperAdmin, isPinned, isStarred, isMuted, convLabel, onClick, onPin, onStar, onMute, onSetLabel }: { conv: any; isSelected: boolean; unread: number; isRTL: boolean; language: string; isSuperAdmin: boolean; isPinned: boolean; isStarred: boolean; isMuted: boolean; convLabel: string | undefined; onClick: () => void; onPin: (id: string) => void; onStar: (id: string) => void; onMute: (id: string) => void; onSetLabel: (id: string, label: string) => void }) => {
  const timeAgo = conv.last_message_at
    ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false, locale: language === 'ar' ? ar : enUS })
    : '';
  const minutesAgo = conv.last_message_at ? differenceInMinutes(new Date(), new Date(conv.last_message_at)) : 999;
  const isOnline = minutesAgo < 5;
  const isAway = !isOnline && minutesAgo < 30;

  return (
    <div
      className={`flex items-center gap-3 p-3 cursor-pointer transition-all duration-200 group relative
        ${isSelected
          ? 'bg-gradient-to-r from-accent/10 to-accent/5 border-s-[3px] border-s-accent shadow-sm'
          : 'hover:bg-muted/40 border-s-[3px] border-s-transparent'}`}
      onClick={onClick}
    >
      {/* Pin indicator */}
      {isPinned && (
        <div className="absolute top-1.5 end-2">
          <Pin className="w-2.5 h-2.5 text-accent/60 fill-current" />
        </div>
      )}
      {/* Color label indicator */}
      {convLabel && convLabel !== 'none' && (
        <div className={`absolute top-0 start-0 w-1 h-full rounded-e ${CONV_LABELS.find(l => l.key === convLabel)?.color || ''}`} />
      )}

      <div className="relative">
        <Avatar className={`w-11 h-11 shrink-0 ring-2 transition-all ${isSelected ? 'ring-accent/30' : 'ring-border/10 group-hover:ring-border/30'}`}>
          <AvatarImage src={conv.other_profile?.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-accent/20 to-primary/10 text-accent font-bold text-xs">
            {conv.other_profile?.full_name?.charAt(0) || '؟'}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <span className="absolute -bottom-0.5 -end-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-card shadow-sm shadow-emerald-500/30" />
        )}
        {isAway && !isOnline && (
          <span className="absolute -bottom-0.5 -end-0.5 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-card shadow-sm" />
        )}
        {!isOnline && !isAway && unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 w-3 h-3 bg-accent rounded-full border-2 border-card animate-pulse" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <h4 className={`text-sm truncate transition-colors ${unread > 0 ? 'font-bold text-foreground' : 'font-medium text-foreground/80'}`}>
              {conv.other_profile?.full_name || (isRTL ? 'مستخدم' : 'User')}
            </h4>
            {isStarred && <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
            {isMuted && <VolumeX className="w-3 h-3 text-muted-foreground/50 shrink-0" />}
          </div>
          <span className={`text-[10px] shrink-0 ${unread > 0 ? 'text-accent font-semibold' : 'text-muted-foreground'}`}>{timeAgo}</span>
        </div>
        {isSuperAdmin && conv.participant_1_name && conv.participant_2_name && (
          <span className="text-[9px] text-muted-foreground truncate block mt-0.5">
            {conv.participant_1_name} ↔ {conv.participant_2_name}
          </span>
        )}
        <div className="flex items-center justify-between mt-0.5">
          <p className={`text-xs truncate ${unread > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
            {conv.last_message_text || (isRTL ? 'ابدأ المحادثة...' : 'Start chatting...')}
          </p>
          {unread > 0 && (
            <Badge className="text-[9px] px-1.5 py-0 h-4 min-w-[18px] justify-center shrink-0 ms-1.5 bg-accent text-accent-foreground border-0 shadow-sm">
              {unread}
            </Badge>
          )}
        </div>
      </div>

      {/* Hover actions */}
      <div className="absolute end-2 bottom-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onPin?.(conv.id); }} className="p-1 rounded-md hover:bg-muted/60 text-muted-foreground" title={isRTL ? 'تثبيت' : 'Pin'}>
          <Pin className={`w-2.5 h-2.5 ${isPinned ? 'fill-current text-accent' : ''}`} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onStar?.(conv.id); }} className="p-1 rounded-md hover:bg-muted/60 text-muted-foreground" title={isRTL ? 'مفضلة' : 'Star'}>
          <Star className={`w-2.5 h-2.5 ${isStarred ? 'fill-amber-500 text-amber-500' : ''}`} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onMute?.(conv.id); }} className="p-1 rounded-md hover:bg-muted/60 text-muted-foreground" title={isRTL ? 'كتم' : 'Mute'}>
          {isMuted ? <Volume2 className="w-2.5 h-2.5" /> : <VolumeX className="w-2.5 h-2.5" />}
        </button>
      </div>
    </div>
  );
});
ConversationItem.displayName = 'ConversationItem';

/* ─── Message Bubble (memo) ─── */
const MessageBubble = React.memo(({ msg, isMine, language, isRTL, onReply, onCopy, onReact, onStar, onForward }: { msg: any; isMine: boolean; language: string; isRTL: boolean; onReply: (msg: any) => void; onCopy: (text: string) => void; onReact: (id: string, emoji: string | null) => void; onStar: (id: string) => void; onForward: (msg: any) => void }) => {
  const [showReactions, setShowReactions] = useState(false);
  const isReply = msg.content?.startsWith('↩️');
  let replyPreview = '';
  let mainContent = msg.content || '';
  if (isReply) {
    const parts = mainContent.split('\n\n');
    replyPreview = parts[0].replace('↩️ ', '');
    mainContent = parts.slice(1).join('\n\n');
  }

  const reaction = msg._reaction;
  const isBookmarked = msg._starred;

  return (
    <div className={`flex group/msg ${isMine ? 'justify-end' : 'justify-start'} mb-2 animate-in fade-in-0 slide-in-from-bottom-1 duration-200`}>
      {/* Actions - mine */}
      {isMine && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-all me-1 self-center">
          <button onClick={() => setShowReactions(!showReactions)} className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors" title={isRTL ? 'تفاعل' : 'React'}>
            <Smile className="w-3 h-3" />
          </button>
          <button onClick={() => onCopy?.(msg.content)} className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors" title={isRTL ? 'نسخ' : 'Copy'}>
            <Copy className="w-3 h-3" />
          </button>
          <button onClick={() => onReply(msg)} className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors" title={isRTL ? 'رد' : 'Reply'}>
            <Reply className="w-3 h-3" />
          </button>
          <button onClick={() => onForward?.(msg)} className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors" title={isRTL ? 'تحويل' : 'Forward'}>
            <Forward className="w-3 h-3" />
          </button>
          <button onClick={() => onStar?.(msg.id)} className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors" title={isRTL ? 'حفظ' : 'Bookmark'}>
            {isBookmarked ? <BookmarkCheck className="w-3 h-3 text-accent" /> : <Bookmark className="w-3 h-3" />}
          </button>
        </div>
      )}

      <div className="relative max-w-[70%]">
        <div className={`relative group/bubble
          ${isMine
            ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-2xl rounded-ee-md shadow-md shadow-primary/10'
            : 'bg-card border border-border/30 rounded-2xl rounded-es-md shadow-sm'}`}>
          {/* Reply context */}
          {isReply && replyPreview && (
            <div className={`mx-3 mt-2 mb-0 px-2.5 py-1.5 rounded-lg text-[10px] flex items-center gap-1.5
              ${isMine ? 'bg-primary-foreground/10 text-primary-foreground/80' : 'bg-muted/50 text-muted-foreground'}`}>
              <Reply className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{replyPreview}</span>
            </div>
          )}

          {/* Attachment */}
          {msg.attachment_url && (
            <div className="px-3 pt-1">
              <AttachmentPreview url={msg.attachment_url} type={msg.message_type} name={msg.content?.startsWith('📎') ? msg.content.slice(3) : undefined} />
            </div>
          )}

          {/* Text */}
          {mainContent && !mainContent.startsWith('📎') && (
            <p className="whitespace-pre-wrap break-words leading-relaxed text-[13px] px-3.5 py-2">{mainContent}</p>
          )}
          {mainContent?.startsWith('📎') && !msg.attachment_url && (
            <p className="whitespace-pre-wrap break-words text-[13px] px-3.5 py-2">{mainContent}</p>
          )}

          {/* Time & status */}
          <div className={`flex items-center gap-1 px-3 pb-1.5 ${isMine ? 'justify-end' : ''}`}>
            <span className={`text-[9px] ${isMine ? 'text-primary-foreground/50' : 'text-muted-foreground/70'}`}>
              {new Date(msg.created_at).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isMine && (
              msg.is_read
                ? <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                : <Check className="w-3 h-3 text-primary-foreground/40" />
            )}
          </div>
        </div>

        {/* Reaction badge */}
        {reaction && (
          <div className={`absolute -bottom-2 ${isMine ? 'start-2' : 'end-2'} bg-card border border-border/30 rounded-full px-1.5 py-0.5 text-xs shadow-sm cursor-pointer hover:scale-110 transition-transform`}
            onClick={() => onReact?.(msg.id, null)}>
            {reaction}
          </div>
        )}

        {/* Bookmark indicator */}
        {isBookmarked && (
          <div className={`absolute -top-1 ${isMine ? 'start-1' : 'end-1'}`}>
            <BookmarkCheck className="w-3 h-3 text-accent" />
          </div>
        )}

        {/* Reactions picker */}
        {showReactions && (
          <div className={`absolute bottom-full mb-1 ${isMine ? 'end-0' : 'start-0'} bg-card border border-border/30 rounded-2xl shadow-xl p-1.5 flex gap-0.5 animate-in fade-in-0 slide-in-from-bottom-2 duration-200 z-10`}>
            {EMOJI_REACTIONS.map(e => (
              <button key={e} onClick={() => { onReact?.(msg.id, e); setShowReactions(false); }}
                className="w-7 h-7 rounded-lg hover:bg-muted/60 flex items-center justify-center text-sm transition-all hover:scale-125">
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions - other */}
      {!isMine && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-all ms-1 self-center">
          <button onClick={() => onReply(msg)} className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors"><Reply className="w-3 h-3" /></button>
          <button onClick={() => setShowReactions(!showReactions)} className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors"><Smile className="w-3 h-3" /></button>
          <button onClick={() => onCopy?.(msg.content)} className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors"><Copy className="w-3 h-3" /></button>
          <button onClick={() => onForward?.(msg)} className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors"><Forward className="w-3 h-3" /></button>
          <button onClick={() => onStar?.(msg.id)} className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors">
            {isBookmarked ? <BookmarkCheck className="w-3 h-3 text-accent" /> : <Bookmark className="w-3 h-3" />}
          </button>
        </div>
      )}
    </div>
  );
});
MessageBubble.displayName = 'MessageBubble';

/* ─── Emoji Quick Picker ─── */
const EmojiQuickPicker = React.memo(({ onSelect, isRTL }: { onSelect: (e: string) => void; isRTL: boolean }) => (
  <div className="absolute bottom-full mb-2 start-0 bg-card border border-border/40 rounded-2xl shadow-xl p-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-200 z-20">
    <p className="text-[9px] text-muted-foreground font-medium mb-2 px-1">{isRTL ? 'رموز سريعة' : 'Quick Emoji'}</p>
    <div className="grid grid-cols-6 gap-0.5">
      {EMOJI_QUICK.map(e => (
        <button key={e} onClick={() => onSelect(e)} className="w-8 h-8 rounded-lg hover:bg-muted/60 flex items-center justify-center text-base transition-all hover:scale-110">
          {e}
        </button>
      ))}
    </div>
  </div>
));
EmojiQuickPicker.displayName = 'EmojiQuickPicker';

/* ─── Chat Info Panel ─── */
const ChatInfoPanel = React.memo(({ conv, messages, isRTL, language, onClose }: { conv: any; messages: Array<any>; isRTL: boolean; language: string; onClose: () => void }) => {
  const totalMsgs = messages.length;
  const attachments = messages.filter((m) => m.attachment_url);
  const images = attachments.filter((m) => m.message_type === 'image');
  const files = attachments.filter((m) => m.message_type === 'file');
  const firstMsg = messages[0];
  const lastMsg = messages[messages.length - 1];

  // Activity heatmap data (messages per day of week)
  const activityByDay = useMemo(() => {
    const days = [0, 0, 0, 0, 0, 0, 0];
    messages.forEach((m) => {
      const d = new Date(m.created_at).getDay();
      days[d]++;
    });
    const max = Math.max(...days, 1);
    return days.map(v => Math.round((v / max) * 100));
  }, [messages]);

  const dayLabels = isRTL
    ? ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="w-80 border-s border-border/30 bg-card flex flex-col animate-in slide-in-from-end duration-300 shrink-0 hidden lg:flex">
      <div className="p-4 border-b border-border/20 flex items-center justify-between">
        <h3 className="font-heading font-bold text-sm flex items-center gap-1.5">
          <Info className="w-4 h-4 text-primary" />
          {isRTL ? 'تفاصيل المحادثة' : 'Chat Details'}
        </h3>
        <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg" onClick={onClose}><X className="w-3.5 h-3.5" /></Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Profile */}
          <div className="text-center space-y-3">
            <Avatar className="w-20 h-20 mx-auto ring-4 ring-border/10 shadow-lg">
              <AvatarImage src={conv?.other_profile?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-accent/20 to-primary/10 text-accent font-bold text-xl">
                {conv?.other_profile?.full_name?.charAt(0) || '؟'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-heading font-bold text-sm">{conv?.other_profile?.full_name}</h4>
              <p className="text-[11px] text-muted-foreground">{conv?.other_profile?.email || ''}</p>
              {(() => {
                const mins = conv?.last_message_at ? differenceInMinutes(new Date(), new Date(conv.last_message_at)) : 999;
                const online = mins < 5;
                const away = !online && mins < 30;
                return (
                  <Badge variant="outline" className="text-[9px] mt-1.5 gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500' : away ? 'bg-amber-400' : 'bg-muted-foreground/30'}`} />
                    {online ? (isRTL ? 'متصل' : 'Online') : away ? (isRTL ? 'بعيد' : 'Away') : (isRTL ? 'غير متصل' : 'Offline')}
                  </Badge>
                );
              })()}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: isRTL ? 'الرسائل' : 'Messages', value: totalMsgs, icon: MessageCircle, color: 'text-primary bg-primary/10' },
              { label: isRTL ? 'المرفقات' : 'Attachments', value: attachments.length, icon: Paperclip, color: 'text-amber-600 bg-amber-500/10' },
              { label: isRTL ? 'الصور' : 'Images', value: images.length, icon: ImageIcon, color: 'text-blue-600 bg-blue-500/10' },
              { label: isRTL ? 'الملفات' : 'Files', value: files.length, icon: FileText, color: 'text-emerald-600 bg-emerald-500/10' },
            ].map((s, i) => (
              <div key={i} className="p-2.5 rounded-xl bg-muted/20 border border-border/20 text-center">
                <div className={`w-7 h-7 rounded-lg mx-auto mb-1 flex items-center justify-center ${s.color}`}>
                  <s.icon className="w-3.5 h-3.5" />
                </div>
                <p className="text-sm font-bold">{s.value}</p>
                <p className="text-[9px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Activity Heatmap */}
          <div className="p-3 rounded-xl bg-muted/10 border border-border/20">
            <p className="text-[10px] font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" />
              {isRTL ? 'نشاط المحادثة' : 'Chat Activity'}
            </p>
            <div className="flex items-end gap-1 h-12">
              {activityByDay.map((pct, i) => (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-sm bg-accent/20 relative" style={{ height: `${Math.max(pct * 0.4, 2)}px` }}>
                        <div className="absolute inset-0 rounded-sm bg-accent" style={{ height: '100%' }} />
                      </div>
                      <span className="text-[8px] text-muted-foreground">{dayLabels[i]}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px]">{pct}%</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Timeline */}
          {firstMsg && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{isRTL ? 'التسلسل الزمني' : 'Timeline'}</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-3 h-3 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{isRTL ? 'بداية المحادثة' : 'Started'}</p>
                    <p className="text-[11px] font-medium">{format(new Date(firstMsg.created_at), 'PP', { locale: isRTL ? ar : enUS })}</p>
                  </div>
                </div>
                {lastMsg && lastMsg.id !== firstMsg.id && (
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Clock className="w-3 h-3 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{isRTL ? 'آخر رسالة' : 'Last message'}</p>
                      <p className="text-[11px] font-medium">{format(new Date(lastMsg.created_at), 'PP p', { locale: isRTL ? ar : enUS })}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Shared media */}
          {images.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                {isRTL ? 'الصور المشتركة' : 'Shared Images'}
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {images.slice(0, 9).map((m) => (
                  <a key={m.id} href={m.attachment_url} target="_blank" rel="noopener noreferrer"
                    className="aspect-square rounded-lg overflow-hidden border border-border/20 hover:opacity-80 transition-opacity">
                    <img src={m.attachment_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </a>
                ))}
              </div>
              {images.length > 9 && (
                <p className="text-[10px] text-center text-muted-foreground mt-1.5">+{images.length - 9} {isRTL ? 'صور أخرى' : 'more'}</p>
              )}
            </div>
          )}

          {/* Shared files */}
          {files.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {isRTL ? 'الملفات المشتركة' : 'Shared Files'}
              </p>
              <div className="space-y-1">
                {files.slice(0, 5).map((m) => (
                  <a key={m.id} href={m.attachment_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[11px] truncate">{m.content?.replace('📎 ', '') || 'File'}</span>
                    <Download className="w-3 h-3 text-muted-foreground ms-auto shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
});
ChatInfoPanel.displayName = 'ChatInfoPanel';

/* ═══════════════════════════════════════════════════════ */
/* ─── Main Component ─── */
/* ═══════════════════════════════════════════════════════ */
const DashboardMessages = () => {
  const { isRTL, language } = useLanguage();
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();

  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deferredSearch, setDeferredSearch] = useState('');
  const [chatSearchTerm, setChatSearchTerm] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchIndex, setChatSearchIndex] = useState(0);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [convFilter, setConvFilter] = useState<'all' | 'unread' | 'starred' | 'pinned'>('all');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [forwardMsg, setForwardMsg] = useState<any | null>(null);

  // Local state for pinned/starred/muted/labels and message reactions/stars
  const [pinnedConvs, setPinnedConvs] = useState<Set<string>>(new Set());
  const [starredConvs, setStarredConvs] = useState<Set<string>>(new Set());
  const [mutedConvs, setMutedConvs] = useState<Set<string>>(new Set());
  const [convLabels, setConvLabels] = useState<Record<string, string>>({});
  const [messageReactions, setMessageReactions] = useState<Record<string, string>>({});
  const [starredMessages, setStarredMessages] = useState<Set<string>>(new Set());
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduledMessages, setScheduledMessages] = useState<{ convId: string; text: string; time: string; id: string }[]>([]);

  const dragCounter = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const handleSearchChange = useCallback((val: string) => {
    setSearchTerm(val);
    startTransition(() => setDeferredSearch(val));
  }, []);

  const togglePinConv = useCallback((id: string) => {
    setPinnedConvs(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);
  const toggleStarConv = useCallback((id: string) => {
    setStarredConvs(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);
  const toggleMuteConv = useCallback((id: string) => {
    setMutedConvs(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    toast.success(isRTL ? 'تم تحديث الإشعارات' : 'Notifications updated');
  }, [isRTL]);
  const setConvLabel = useCallback((id: string, label: string) => {
    setConvLabels(prev => {
      const next = { ...prev };
      if (label === 'none') delete next[id];
      else next[id] = label;
      return next;
    });
    const found = CONV_LABELS.find(l => l.key === label);
    if (found && label !== 'none') toast.success(isRTL ? `تم تصنيف المحادثة: ${found.label_ar}` : `Labeled: ${found.label_en}`);
  }, [isRTL]);
  const handleReactMessage = useCallback((msgId: string, emoji: string | null) => {
    setMessageReactions(prev => {
      const next = { ...prev };
      if (emoji === null || next[msgId] === emoji) delete next[msgId];
      else next[msgId] = emoji;
      return next;
    });
  }, []);
  const toggleStarMessage = useCallback((msgId: string) => {
    setStarredMessages(prev => { const next = new Set(prev); if (next.has(msgId)) next.delete(msgId); else next.add(msgId); return next; });
  }, []);
  const handleForwardMessage = useCallback((msg: any) => {
    setForwardMsg(msg);
    toast.info(isRTL ? 'اختر محادثة لتحويل الرسالة إليها' : 'Select a conversation to forward to');
  }, [isRTL]);

  /* ─── Drag & Drop ─── */
  const handleDragFile = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE) { toast.error(isRTL ? 'حجم الملف يتجاوز 10 ميجابايت' : 'File size exceeds 10MB'); return; }
    setAttachedFile(file);
    if (IMAGE_TYPES.includes(file.type)) {
      const reader = new FileReader();
      reader.onload = (ev) => setAttachedPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else { setAttachedPreview(null); }
  }, [isRTL]);

  const handleDragEnter = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounter.current++; if (e.dataTransfer.types.includes('Files')) setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounter.current--; if (dragCounter.current === 0) setIsDragging(false); }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false); dragCounter.current = 0;
    const file = e.dataTransfer.files?.[0]; if (file) handleDragFile(file);
  }, [handleDragFile]);

  /* ─── Fetch Conversations ─── */
  const { data: conversations = [], isLoading: loadingConvs } = useQuery({
    queryKey: ['conversations', user?.id, isSuperAdmin],
    queryFn: async () => {
      let query = supabase.from('conversations').select('*');
      if (!isSuperAdmin) query = query.or(`participant_1.eq.${user!.id},participant_2.eq.${user!.id}`);
      const { data, error } = await query.order('last_message_at', { ascending: false });
      if (error) throw error;

      const allIds = new Set<string>();
      data.forEach((c) => { if (c.participant_1) allIds.add(c.participant_1); if (c.participant_2) allIds.add(c.participant_2); });
      allIds.delete(user!.id);

      if (allIds.size > 0) {
        const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, avatar_url, email').in('user_id', Array.from(allIds));
        const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

        if (isSuperAdmin) {
          const { data: allProfiles } = await supabase.from('profiles').select('user_id, full_name, avatar_url, email').in('user_id', Array.from(new Set(data.flatMap((c) => [c.participant_1, c.participant_2]))));
          (allProfiles || []).forEach((p) => { if (!profileMap.has(p.user_id)) profileMap.set(p.user_id, p); });
        }

        return data.map((c) => {
          const otherId = c.participant_1 === user!.id ? c.participant_2 : c.participant_1;
          const otherProfile = profileMap.get(otherId) || { full_name: isRTL ? 'مستخدم' : 'User' };
          if (isSuperAdmin) {
            const p1 = profileMap.get(c.participant_1);
            const p2 = profileMap.get(c.participant_2);
            return { ...c, other_profile: otherProfile, participant_1_name: p1?.full_name || (isRTL ? 'مستخدم' : 'User'), participant_2_name: p2?.full_name || (isRTL ? 'مستخدم' : 'User') };
          }
          return { ...c, other_profile: otherProfile };
        });
      }
      return data.map((c: any) => ({ ...c, other_profile: { full_name: isRTL ? 'مستخدم' : 'User' } as any }));
    },
    enabled: !!user,
  });

  /* ─── Unread counts ─── */
  const { data: unreadCounts = {} } = useQuery({
    queryKey: ['unread-counts', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('messages').select('conversation_id').eq('is_read', false).neq('sender_id', user!.id);
      const counts: Record<string, number> = {};
      (data || []).forEach((m) => { counts[m.conversation_id] = (counts[m.conversation_id] || 0) + 1; });
      return counts;
    },
    enabled: !!user,
  });

  const totalUnread = useMemo(() => Object.values(unreadCounts).reduce((a: number, b: number) => a + b, 0), [unreadCounts]);

  /* ─── Fetch Messages ─── */
  const { data: messages = [], isLoading: loadingMsgs } = useQuery({
    queryKey: ['messages', selectedConversation],
    queryFn: async () => {
      const { data, error } = await supabase.from('messages').select('*').eq('conversation_id', selectedConversation!).order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedConversation,
  });

  /* ─── Realtime ─── */
  useEffect(() => {
    if (!selectedConversation) return;
    const channel = supabase
      .channel(`messages-${selectedConversation}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConversation}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation] });
        queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['unread-counts', user?.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConversation, user?.id, queryClient]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('conversations-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
        queryClient.invalidateQueries({ queryKey: ['unread-counts', user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  /* ─── Mark as read ─── */
  useEffect(() => {
    if (!selectedConversation || !user) return;
    const unread = messages.filter((m) => !m.is_read && m.sender_id !== user.id);
    if (unread.length > 0) {
      supabase.from('messages').update({ is_read: true }).eq('conversation_id', selectedConversation).neq('sender_id', user.id).eq('is_read', false).then(() => {
        queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
        queryClient.invalidateQueries({ queryKey: ['unread-counts', user.id] });
      });
    }
  }, [messages, selectedConversation, user, queryClient]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (selectedConversation) setTimeout(() => inputRef.current?.focus(), 100); }, [selectedConversation]);

  /* ─── File handling ─── */
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { toast.error(isRTL ? 'حجم الملف يتجاوز 10 ميجابايت' : 'File size exceeds 10MB'); return; }
    setAttachedFile(file);
    if (IMAGE_TYPES.includes(file.type)) {
      const reader = new FileReader();
      reader.onload = (ev) => setAttachedPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else { setAttachedPreview(null); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [isRTL]);

  const removeAttachment = useCallback(() => { setAttachedFile(null); setAttachedPreview(null); }, []);

  const uploadFile = useCallback(async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'bin';
    const fileName = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('chat-attachments').upload(fileName, file, { contentType: file.type });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('chat-attachments').getPublicUrl(fileName);
    return urlData.publicUrl;
  }, [user]);

  /* ─── Send message ─── */
  const sendMutation = useMutation({
    mutationFn: async () => {
      setIsUploading(true);
      let attachmentUrl: string | null = null;
      let msgType = 'text';
      if (attachedFile) {
        attachmentUrl = await uploadFile(attachedFile);
        msgType = IMAGE_TYPES.includes(attachedFile.type) ? 'image' : 'file';
      }
      let content = messageText.trim() || (attachedFile ? `📎 ${attachedFile.name}` : '');
      if (replyTo) content = `↩️ ${replyTo.content?.substring(0, 50)}${replyTo.content?.length > 50 ? '...' : ''}\n\n${content}`;
      if (!content && !attachmentUrl) return;

      const { error } = await supabase.from('messages').insert({
        conversation_id: selectedConversation!,
        sender_id: user!.id,
        content,
        attachment_url: attachmentUrl,
        message_type: msgType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessageText('');
      removeAttachment();
      setReplyTo(null);
      setIsUploading(false);
      setShowEmoji(false);
      setForwardMsg(null);
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
    },
    onError: () => { setIsUploading(false); toast.error(isRTL ? 'فشل إرسال الرسالة' : 'Failed to send'); },
  });

  const handleSend = useCallback(() => { if ((!messageText.trim() && !attachedFile) || !selectedConversation) return; sendMutation.mutate(); }, [messageText, attachedFile, selectedConversation, sendMutation]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }, [handleSend]);
  const handleReply = useCallback((msg: any) => { setReplyTo(msg); inputRef.current?.focus(); }, []);
  const handleCopy = useCallback((text: string) => { if (!text) return; navigator.clipboard.writeText(text); toast.success(isRTL ? 'تم النسخ' : 'Copied'); }, [isRTL]);
  const handleEmojiSelect = useCallback((emoji: string) => { setMessageText(prev => prev + emoji); setShowEmoji(false); inputRef.current?.focus(); }, []);

  /* ─── Schedule Message ─── */
  const handleScheduleMessage = useCallback(() => {
    if (!messageText.trim() || !selectedConversation || !scheduleTime) return;
    const id = crypto.randomUUID();
    setScheduledMessages(prev => [...prev, { id, convId: selectedConversation, text: messageText.trim(), time: scheduleTime }]);
    setMessageText('');
    setShowScheduler(false);
    setScheduleTime('');
    toast.success(isRTL ? `تمت جدولة الرسالة` : `Message scheduled`);
  }, [messageText, selectedConversation, scheduleTime, isRTL]);

  const cancelScheduledMessage = useCallback((id: string) => {
    setScheduledMessages(prev => prev.filter(m => m.id !== id));
    toast.success(isRTL ? 'تم إلغاء الرسالة المجدولة' : 'Scheduled message cancelled');
  }, [isRTL]);

  /* ─── Filter & Select ─── */
  const filteredConversations = useMemo(() => {
    let result = conversations;
    if (deferredSearch) result = result.filter((c) => c.other_profile?.full_name?.toLowerCase().includes(deferredSearch.toLowerCase()));
    if (convFilter === 'unread') result = result.filter((c) => (unreadCounts as Record<string, number>)[c.id] > 0);
    if (convFilter === 'starred') result = result.filter((c) => starredConvs.has(c.id));
    if (convFilter === 'pinned') result = result.filter((c) => pinnedConvs.has(c.id));

    result = [...result].sort((a, b) => {
      const aPinned = pinnedConvs.has(a.id) ? 1 : 0;
      const bPinned = pinnedConvs.has(b.id) ? 1 : 0;
      return bPinned - aPinned;
    });

    return result;
  }, [conversations, deferredSearch, convFilter, unreadCounts, starredConvs, pinnedConvs]);

  const selectedConv = conversations.find((c) => c.id === selectedConversation);

  /* ─── Export Chat ─── */
  const handleExportChat = useCallback(() => {
    if (!messages.length || !selectedConv) return;
    const name = selectedConv.other_profile?.full_name || 'User';
    const lines = messages.map((m) => {
      const time = new Date(m.created_at).toLocaleString(language === 'ar' ? 'ar-SA' : 'en');
      const sender = m.sender_id === user?.id ? (isRTL ? 'أنا' : 'Me') : name;
      return `[${time}] ${sender}: ${m.content || (m.attachment_url ? '📎 مرفق' : '')}`;
    });
    const header = `${isRTL ? 'سجل المحادثة مع' : 'Chat history with'} ${name}\n${isRTL ? 'تاريخ التصدير' : 'Exported on'}: ${new Date().toLocaleString(language === 'ar' ? 'ar-SA' : 'en')}\n${'─'.repeat(50)}\n\n`;
    const content = header + lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${name}-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isRTL ? 'تم تصدير المحادثة بنجاح' : 'Chat exported successfully');
  }, [messages, selectedConv, user?.id, isRTL, language]);


  const filteredMessages = useMemo(() => {
    if (!chatSearchTerm) return messages;
    return messages.filter((m) => m.content?.toLowerCase().includes(chatSearchTerm.toLowerCase()));
  }, [messages, chatSearchTerm]);

  const enrichedMessages = useMemo(() => {
    const source = chatSearchTerm ? filteredMessages : messages;
    return source.map((m) => ({ ...m, _reaction: messageReactions[m.id] || null, _starred: starredMessages.has(m.id) }));
  }, [messages, filteredMessages, chatSearchTerm, messageReactions, starredMessages]);

  const groupedMessages = useMemo(() => {
    const groups: { date: string; label: string; messages: Array<any> }[] = [];
    enrichedMessages.forEach((msg) => {
      const d = new Date(msg.created_at);
      const dateKey = format(d, 'yyyy-MM-dd');
      const last = groups[groups.length - 1];
      if (last && last.date === dateKey) last.messages.push(msg);
      else groups.push({ date: dateKey, label: getDateLabel(msg.created_at, language), messages: [msg] });
    });
    return groups;
  }, [enrichedMessages, language]);

  /* ─── Stats ─── */
  const stats = useMemo(() => ({
    total: conversations.length,
    unread: totalUnread,
    starred: starredConvs.size,
    pinned: pinnedConvs.size,
  }), [conversations.length, totalUnread, starredConvs.size, pinnedConvs.size]);

  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={200}>
        <div className="h-[calc(100vh-8rem)]">
          {/* ─── Stats Bar ─── */}
          <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
            {[
              { icon: MessageSquare, label: isRTL ? 'المحادثات' : 'Chats', value: stats.total, color: 'text-primary bg-primary/10', filter: 'all' as const },
              { icon: Clock, label: isRTL ? 'غير مقروءة' : 'Unread', value: stats.unread, color: 'text-amber-600 bg-amber-500/10', filter: 'unread' as const },
              { icon: Star, label: isRTL ? 'مميزة' : 'Starred', value: stats.starred, color: 'text-yellow-600 bg-yellow-500/10', filter: 'starred' as const },
              { icon: Pin, label: isRTL ? 'مثبتة' : 'Pinned', value: stats.pinned, color: 'text-blue-600 bg-blue-500/10', filter: 'pinned' as const },
            ].map((s, i) => (
              <button
                key={i}
                onClick={() => setConvFilter(s.filter)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border shrink-0 transition-all hover:shadow-sm cursor-pointer ${
                  convFilter === s.filter
                    ? 'border-accent/40 bg-accent/5 shadow-sm'
                    : 'border-border/30 bg-card hover:bg-muted/30'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}><s.icon className="w-4 h-4" /></div>
                <div>
                  <p className="text-base font-bold leading-none">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="flex h-[calc(100%-3.5rem)] border border-border/30 rounded-2xl overflow-hidden bg-card shadow-lg">
            {/* ═══ Conversations List ═══ */}
            <div className={`w-full md:w-[320px] lg:w-[340px] border-e border-border/30 flex flex-col bg-card ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
              {/* Header */}
              <div className="p-3 border-b border-border/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading font-bold text-base flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent/20 to-primary/10 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-accent" />
                    </div>
                    {isRTL ? 'المحادثات' : 'Messages'}
                    {totalUnread > 0 && (
                      <Badge className="text-[9px] px-1.5 py-0 h-4 min-w-[18px] justify-center bg-accent text-accent-foreground border-0 animate-pulse">{totalUnread}</Badge>
                    )}
                  </h2>
                </div>

                {/* Filter tabs */}
                <div className="flex bg-muted/50 border border-border/30 rounded-xl overflow-hidden p-0.5">
                  {[
                    { key: 'all' as const, icon: Users, label: isRTL ? 'الكل' : 'All' },
                    { key: 'unread' as const, icon: Archive, label: isRTL ? 'غير مقروء' : 'Unread' },
                    { key: 'starred' as const, icon: Star, label: isRTL ? 'مميزة' : 'Starred' },
                    { key: 'pinned' as const, icon: Pin, label: isRTL ? 'مثبتة' : 'Pinned' },
                  ].map(f => (
                    <button
                      key={f.key}
                      className={`flex-1 px-1.5 py-1.5 text-[10px] font-medium transition-all rounded-lg flex items-center justify-center gap-1
                        ${convFilter === f.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setConvFilter(f.key)}
                    >
                      <f.icon className="w-3 h-3" />
                      <span className="hidden sm:inline">{f.label}</span>
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="absolute top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                  <Input
                    value={searchTerm}
                    onChange={e => handleSearchChange(e.target.value)}
                    placeholder={isRTL ? 'بحث في المحادثات...' : 'Search conversations...'}
                    className="ps-9 h-9 text-xs bg-muted/30 border-border/20 rounded-xl focus:bg-background transition-colors"
                  />
                  {searchTerm && (
                    <button onClick={() => handleSearchChange('')} className="absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" style={{ [isRTL ? 'left' : 'right']: '10px' }}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Forward mode banner */}
              {forwardMsg && (
                <div className="px-3 py-2 bg-accent/10 border-b border-accent/20 flex items-center gap-2">
                  <Forward className="w-4 h-4 text-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-accent">{isRTL ? 'اختر محادثة للتحويل' : 'Select conversation to forward'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{forwardMsg.content?.substring(0, 40)}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0" onClick={() => setForwardMsg(null)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}

              {/* List */}
              <ScrollArea className="flex-1">
                {loadingConvs ? (
                  <ConversationSkeleton />
                ) : filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center">
                      <MessageSquare className="w-8 h-8 text-accent/40" />
                    </div>
                    <p className="font-heading font-bold text-sm mb-1">{isRTL ? 'لا توجد محادثات' : 'No conversations'}</p>
                    <p className="text-xs text-muted-foreground mb-5">{isRTL ? 'ابدأ التواصل مع مزودي الخدمة' : 'Start connecting with providers'}</p>
                    <div className="space-y-2 text-start bg-muted/30 rounded-xl p-3.5 border border-border/20">
                      <p className="text-xs font-semibold text-foreground mb-2">{isRTL ? '💡 نصائح:' : '💡 Tips:'}</p>
                      {[
                        { emoji: '🔍', text: isRTL ? 'ابحث عن مزودي الخدمة' : 'Find providers' },
                        { emoji: '💬', text: isRTL ? 'اضغط "تواصل" في صفحة المزود' : 'Click "Contact" on provider page' },
                        { emoji: '📎', text: isRTL ? 'أرسل صور وملفات بسهولة' : 'Send files & photos easily' },
                        { emoji: '⭐', text: isRTL ? 'ميّز المحادثات المهمة بنجمة' : 'Star important conversations' },
                      ].map((tip, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{tip.emoji}</span><span>{tip.text}</span>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="mt-4 gap-1.5 text-xs h-9 rounded-xl" onClick={() => navigate('/search')}>
                      <Search className="w-3.5 h-3.5" />{isRTL ? 'بحث عن مزودين' : 'Find Providers'}
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border/10">
                    {filteredConversations.map((conv) => (
                      <ConversationItem
                        key={conv.id} conv={conv}
                        isSelected={conv.id === selectedConversation}
                        unread={(unreadCounts as Record<string, number>)[conv.id] || 0}
                        isRTL={isRTL} language={language} isSuperAdmin={isSuperAdmin}
                        isPinned={pinnedConvs.has(conv.id)}
                        isStarred={starredConvs.has(conv.id)}
                        isMuted={mutedConvs.has(conv.id)}
                        onClick={() => {
                          if (forwardMsg) {
                            // Forward to this conversation
                            setSelectedConversation(conv.id);
                            setMessageText(`↪️ ${forwardMsg.content || ''}`);
                            setForwardMsg(null);
                            setTimeout(() => inputRef.current?.focus(), 100);
                          } else {
                            setSelectedConversation(conv.id);
                          }
                        }}
                        onPin={togglePinConv}
                        onStar={toggleStarConv}
                        onMute={toggleMuteConv}
                        convLabel={convLabels[conv.id] || 'none'}
                        onSetLabel={setConvLabel}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* ═══ Chat Area ═══ */}
            <div
              className={`flex-1 flex flex-col relative bg-muted/20 ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}
              onDragEnter={selectedConversation ? handleDragEnter : undefined}
              onDragLeave={selectedConversation ? handleDragLeave : undefined}
              onDragOver={selectedConversation ? handleDragOver : undefined}
              onDrop={selectedConversation ? handleDrop : undefined}
            >
              {/* Drag overlay */}
              {isDragging && selectedConversation && (
                <div className="absolute inset-0 z-50 bg-accent/10 border-2 border-dashed border-accent rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-accent/20 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-accent" />
                    </div>
                    <p className="font-heading font-bold text-sm text-accent">{isRTL ? 'أفلت الملف هنا' : 'Drop file here'}</p>
                    <p className="text-xs text-muted-foreground mt-1">{isRTL ? 'الحد الأقصى 10 ميجابايت' : 'Max 10MB'}</p>
                  </div>
                </div>
              )}

              {!selectedConversation ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center max-w-sm">
                    <div className="w-24 h-24 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-accent/15 to-primary/10 flex items-center justify-center shadow-inner">
                      <MessageSquare className="w-12 h-12 text-accent/30" />
                    </div>
                    <p className="font-heading font-bold text-xl mb-2">{isRTL ? 'مرحباً بك في المحادثات' : 'Welcome to Messages'}</p>
                    <p className="text-sm text-muted-foreground mb-6">{isRTL ? 'اختر محادثة من القائمة أو ابدأ محادثة جديدة' : 'Select a conversation or start a new one'}</p>
                    <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                      {[
                        { icon: Shield, label: isRTL ? 'مشفّرة' : 'Encrypted', desc: isRTL ? 'محادثات آمنة' : 'Secure chats' },
                        { icon: Paperclip, label: isRTL ? 'مرفقات' : 'Attachments', desc: isRTL ? 'صور وملفات' : 'Images & files' },
                        { icon: Sparkles, label: isRTL ? 'قوالب' : 'Templates', desc: isRTL ? 'ردود جاهزة' : 'Quick replies' },
                        { icon: Forward, label: isRTL ? 'تحويل' : 'Forward', desc: isRTL ? 'إعادة توجيه' : 'Forward msgs' },
                      ].map((feat, i) => (
                        <div key={i} className="p-3 rounded-xl bg-card border border-border/30 text-center hover:border-accent/30 transition-colors">
                          <feat.icon className="w-5 h-5 text-accent mx-auto mb-1.5" />
                          <p className="text-xs font-heading font-bold">{feat.label}</p>
                          <p className="text-[9px] text-muted-foreground">{feat.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* ─── Chat Header ─── */}
                  <div className="h-14 flex items-center gap-3 px-4 border-b border-border/30 bg-card/80 backdrop-blur-sm shrink-0">
                    <Button variant="ghost" size="icon" className="md:hidden shrink-0 h-9 w-9 rounded-xl" onClick={() => setSelectedConversation(null)}>
                      <BackIcon className="w-4 h-4" />
                    </Button>
                    <div className="relative">
                      <Avatar className="w-9 h-9 shrink-0 ring-2 ring-border/10">
                        <AvatarImage src={selectedConv?.other_profile?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-accent/20 to-primary/10 text-accent font-bold text-xs">
                          {selectedConv?.other_profile?.full_name?.charAt(0) || '؟'}
                        </AvatarFallback>
                      </Avatar>
                      {(() => {
                        const mins = selectedConv?.last_message_at ? differenceInMinutes(new Date(), new Date(selectedConv.last_message_at)) : 999;
                        const online = mins < 5;
                        const away = !online && mins < 30;
                        return online
                          ? <span className="absolute -bottom-0.5 -end-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card shadow-sm shadow-emerald-500/30" />
                          : away
                            ? <span className="absolute -bottom-0.5 -end-0.5 w-3 h-3 bg-amber-400 rounded-full border-2 border-card" />
                            : <span className="absolute -bottom-0.5 -end-0.5 w-3 h-3 bg-muted-foreground/30 rounded-full border-2 border-card" />;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-bold text-sm truncate">{selectedConv?.other_profile?.full_name || (isRTL ? 'مستخدم' : 'User')}</h3>
                      {(() => {
                        const mins = selectedConv?.last_message_at ? differenceInMinutes(new Date(), new Date(selectedConv.last_message_at)) : 999;
                        if (mins < 5) return (
                          <p className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {isRTL ? 'متصل الآن' : 'Online'}
                          </p>
                        );
                        if (mins < 30) return (
                          <p className="text-[10px] text-amber-500 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            {isRTL ? 'بعيد' : 'Away'}
                          </p>
                        );
                        return (
                          <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                            {selectedConv?.last_message_at
                              ? `${isRTL ? 'آخر ظهور' : 'Last seen'} ${formatDistanceToNow(new Date(selectedConv.last_message_at), { addSuffix: true, locale: language === 'ar' ? ar : enUS })}`
                              : (isRTL ? 'غير متصل' : 'Offline')}
                          </p>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-xl" onClick={() => { setShowChatSearch(!showChatSearch); setChatSearchTerm(''); }}>
                            <Search className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">{isRTL ? 'بحث في الرسائل' : 'Search messages'}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className={`w-8 h-8 rounded-xl ${showInfoPanel ? 'bg-muted' : ''}`} onClick={() => setShowInfoPanel(!showInfoPanel)}>
                            <Info className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">{isRTL ? 'تفاصيل المحادثة' : 'Chat details'}</TooltipContent>
                      </Tooltip>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-xl"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="rounded-xl min-w-[180px]">
                          <DropdownMenuItem onClick={() => navigate(`/${selectedConv?.other_profile?.username || ''}`)} className="rounded-lg text-xs gap-2">
                            <Eye className="w-3.5 h-3.5" />{isRTL ? 'عرض الملف الشخصي' : 'View profile'}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-lg text-xs gap-2" onClick={() => togglePinConv(selectedConversation!)}>
                            <Pin className={`w-3.5 h-3.5 ${pinnedConvs.has(selectedConversation!) ? 'fill-current text-accent' : ''}`} />
                            {pinnedConvs.has(selectedConversation!) ? (isRTL ? 'إلغاء التثبيت' : 'Unpin') : (isRTL ? 'تثبيت' : 'Pin')}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-lg text-xs gap-2" onClick={() => toggleStarConv(selectedConversation!)}>
                            <Star className={`w-3.5 h-3.5 ${starredConvs.has(selectedConversation!) ? 'fill-amber-500 text-amber-500' : ''}`} />
                            {starredConvs.has(selectedConversation!) ? (isRTL ? 'إزالة النجمة' : 'Unstar') : (isRTL ? 'تمييز بنجمة' : 'Star')}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-lg text-xs gap-2" onClick={() => toggleMuteConv(selectedConversation!)}>
                            {mutedConvs.has(selectedConversation!)
                              ? <><Bell className="w-3.5 h-3.5" />{isRTL ? 'تفعيل الإشعارات' : 'Unmute'}</>
                              : <><BellOff className="w-3.5 h-3.5" />{isRTL ? 'كتم الإشعارات' : 'Mute'}</>}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="rounded-lg text-xs gap-2" onClick={() => setShowInfoPanel(true)}>
                            <BarChart3 className="w-3.5 h-3.5" />{isRTL ? 'إحصائيات المحادثة' : 'Chat statistics'}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-lg text-xs gap-2" onClick={handleExportChat}>
                            <FileDown className="w-3.5 h-3.5" />{isRTL ? 'تصدير المحادثة' : 'Export chat'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <p className="px-2 py-1 text-[9px] font-semibold text-muted-foreground uppercase">{isRTL ? 'تصنيف' : 'Label'}</p>
                          {CONV_LABELS.map(l => (
                            <DropdownMenuItem key={l.key} className="rounded-lg text-xs gap-2" onClick={() => setConvLabel(selectedConversation!, l.key)}>
                              {l.color ? <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} /> : <X className="w-2.5 h-2.5 text-muted-foreground" />}
                              {language === 'ar' ? l.label_ar : l.label_en}
                              {convLabels[selectedConversation!] === l.key && <Check className="w-3 h-3 ms-auto text-accent" />}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* ─── Chat Search Bar ─── */}
                  {showChatSearch && (
                    <div className="px-4 py-2 border-b border-border/20 bg-accent/5 backdrop-blur-sm flex items-center gap-2 animate-in slide-in-from-top-1 duration-200">
                      <Search className="w-4 h-4 text-accent shrink-0" />
                      <Input value={chatSearchTerm} onChange={e => { setChatSearchTerm(e.target.value); setChatSearchIndex(0); }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && filteredMessages.length > 0) {
                            setChatSearchIndex(prev => (prev + 1) % filteredMessages.length);
                            const target = document.getElementById(`msg-${filteredMessages[chatSearchIndex]?.id}`);
                            target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }}
                        placeholder={isRTL ? 'بحث في الرسائل...' : 'Search messages...'}
                        className="h-8 text-xs border-0 bg-transparent shadow-none focus-visible:ring-0 rounded-xl" autoFocus />
                      {chatSearchTerm && filteredMessages.length > 0 && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <span className="text-[10px] text-muted-foreground font-medium tabular-nums">
                            {chatSearchIndex + 1}/{filteredMessages.length}
                          </span>
                          <Button variant="ghost" size="icon" className="w-6 h-6 rounded-md" onClick={() => {
                            const prev = (chatSearchIndex - 1 + filteredMessages.length) % filteredMessages.length;
                            setChatSearchIndex(prev);
                            document.getElementById(`msg-${filteredMessages[prev]?.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}>
                            <ChevronUp className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-6 h-6 rounded-md" onClick={() => {
                            const next = (chatSearchIndex + 1) % filteredMessages.length;
                            setChatSearchIndex(next);
                            document.getElementById(`msg-${filteredMessages[next]?.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}>
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                      {chatSearchTerm && filteredMessages.length === 0 && (
                        <span className="text-[10px] text-muted-foreground shrink-0">{isRTL ? 'لا نتائج' : 'No results'}</span>
                      )}
                      <Button variant="ghost" size="icon" className="w-7 h-7 shrink-0 rounded-lg" onClick={() => { setShowChatSearch(false); setChatSearchTerm(''); setChatSearchIndex(0); }}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}

                  {/* ─── Messages ─── */}
                  <ScrollArea className="flex-1 px-4 py-3" ref={scrollAreaRef}>
                    {loadingMsgs ? (
                      <div className="space-y-3 py-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                            <Skeleton className={`h-10 rounded-2xl ${i % 2 === 0 ? 'w-48' : 'w-36'}`} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {groupedMessages.map((group) => (
                          <React.Fragment key={group.date}>
                            <div className="flex items-center gap-4 my-4">
                              <div className="flex-1 h-px bg-border/30" />
                              <span className="text-[10px] text-muted-foreground font-medium bg-card/80 backdrop-blur-sm px-3 py-1 rounded-full border border-border/20 shadow-sm">
                                {group.label}
                              </span>
                              <div className="flex-1 h-px bg-border/30" />
                            </div>
                            {group.messages.map((msg) => {
                              const isSearchMatch = chatSearchTerm && msg.content?.toLowerCase().includes(chatSearchTerm.toLowerCase());
                              return (
                                <div key={msg.id} id={`msg-${msg.id}`} className={isSearchMatch ? 'bg-accent/10 rounded-xl -mx-1 px-1 transition-colors' : ''}>
                                  <MessageBubble msg={msg} isMine={msg.sender_id === user?.id} language={language} isRTL={isRTL}
                                    onReply={handleReply} onCopy={handleCopy} onReact={handleReactMessage} onStar={toggleStarMessage} onForward={handleForwardMessage} />
                                </div>
                              );
                            })}
                          </React.Fragment>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* ─── Scroll to bottom ─── */}
                  {messages.length > 20 && (
                    <button
                      onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                      className="absolute bottom-24 end-4 w-9 h-9 rounded-full bg-card border border-border/30 shadow-lg flex items-center justify-center hover:bg-muted/50 transition-all z-10"
                    >
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}

                  {/* ─── Reply Preview ─── */}
                  {replyTo && (
                    <div className="px-4 pt-2 border-t border-border/20 bg-card/60 backdrop-blur-sm animate-in slide-in-from-bottom-1 duration-200">
                      <div className="flex items-center gap-2.5 p-2 bg-muted/40 rounded-xl border border-border/20">
                        <div className="w-1 h-8 rounded-full bg-accent shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-accent font-semibold">{isRTL ? 'رد على رسالة' : 'Replying to'}</p>
                          <p className="text-xs text-muted-foreground truncate">{replyTo.content?.substring(0, 60)}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0 rounded-lg" onClick={() => setReplyTo(null)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ─── Attachment Preview ─── */}
                  {attachedFile && (
                    <div className="px-4 pt-2 border-t border-border/20 animate-in slide-in-from-bottom-1 duration-200">
                      <div className="flex items-center gap-2.5 p-2.5 bg-muted/40 rounded-xl border border-border/20">
                        {attachedPreview ? (
                          <img src={attachedPreview} alt="" className="w-12 h-12 rounded-xl object-cover border border-border/20" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center border border-border/20">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{attachedFile.name}</p>
                          <p className="text-[10px] text-muted-foreground">{formatFileSize(attachedFile.size)}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="w-7 h-7 shrink-0 rounded-lg" onClick={removeAttachment}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ─── Input Area ─── */}
                  <div className="p-3 border-t border-border/30 bg-card relative">
                    {showTemplates && (
                      <MessageTemplates onSelectTemplate={(content) => { setMessageText(content); setShowTemplates(false); inputRef.current?.focus(); }} onClose={() => setShowTemplates(false)} />
                    )}
                    {showEmoji && <EmojiQuickPicker onSelect={handleEmojiSelect} isRTL={isRTL} />}

                    <div className="flex gap-1.5 items-end">
                      <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" className="hidden" onChange={handleFileSelect} />

                      <div className="flex items-center gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                              <Paperclip className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">{isRTL ? 'إرفاق ملف' : 'Attach'}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className={`shrink-0 h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground ${showEmoji ? 'bg-muted text-foreground' : ''}`} onClick={() => { setShowEmoji(!showEmoji); setShowTemplates(false); }}>
                              <Smile className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">{isRTL ? 'رموز' : 'Emoji'}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className={`shrink-0 h-9 w-9 rounded-xl text-muted-foreground hover:text-accent ${showTemplates ? 'bg-muted text-accent' : ''}`} onClick={() => { setShowTemplates(!showTemplates); setShowEmoji(false); }}>
                              <Sparkles className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">{isRTL ? 'قوالب' : 'Templates'}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className={`shrink-0 h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground ${showScheduler ? 'bg-muted text-accent' : ''}`} onClick={() => { setShowScheduler(!showScheduler); setShowEmoji(false); setShowTemplates(false); }}>
                              <Timer className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">{isRTL ? 'جدولة' : 'Schedule'}</TooltipContent>
                        </Tooltip>
                      </div>

                      <Input
                        ref={inputRef}
                        value={messageText}
                        onChange={e => setMessageText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => { setShowEmoji(false); }}
                        placeholder={isRTL ? 'اكتب رسالتك...' : 'Type a message...'}
                        className="flex-1 h-10 text-sm bg-muted/30 border-border/20 rounded-xl focus:bg-background transition-colors"
                        disabled={isUploading}
                      />

                      <Button
                        onClick={handleSend}
                        disabled={(!messageText.trim() && !attachedFile) || sendMutation.isPending || isUploading}
                        className="shrink-0 h-10 w-10 rounded-xl bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 text-accent-foreground shadow-md shadow-accent/20 transition-all disabled:opacity-40"
                      >
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>

                    {/* Scheduler popup */}
                    {showScheduler && (
                      <div className="mt-2 p-3 bg-muted/30 rounded-xl border border-border/20 animate-in slide-in-from-bottom-1 duration-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Timer className="w-4 h-4 text-accent shrink-0" />
                          <p className="text-xs font-bold text-foreground">{isRTL ? 'جدولة الرسالة' : 'Schedule Message'}</p>
                        </div>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <input
                              type="datetime-local"
                              value={scheduleTime}
                              onChange={e => setScheduleTime(e.target.value)}
                              min={new Date().toISOString().slice(0, 16)}
                              className="w-full h-9 px-3 text-xs rounded-lg border border-border/30 bg-background focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                            />
                          </div>
                          <Button size="sm" className="h-9 gap-1.5 rounded-lg text-xs" disabled={!messageText.trim() || !scheduleTime} onClick={handleScheduleMessage}>
                            <Timer className="w-3.5 h-3.5" />
                            {isRTL ? 'جدولة' : 'Schedule'}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-9 rounded-lg text-xs" onClick={() => { setShowScheduler(false); setScheduleTime(''); }}>
                            {isRTL ? 'إلغاء' : 'Cancel'}
                          </Button>
                        </div>
                        {!messageText.trim() && (
                          <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {isRTL ? 'اكتب رسالة أولاً قبل الجدولة' : 'Write a message first to schedule'}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Scheduled messages indicator */}
                    {scheduledMessages.filter(s => s.convId === selectedConversation).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {scheduledMessages.filter(s => s.convId === selectedConversation).map(sm => (
                          <div key={sm.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                            <Timer className="w-3 h-3 text-amber-600 shrink-0" />
                            <p className="text-[10px] text-foreground truncate flex-1">{sm.text}</p>
                            <span className="text-[9px] text-amber-600 font-medium shrink-0">
                              {new Date(sm.time).toLocaleString(language === 'ar' ? 'ar-SA' : 'en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <button onClick={() => cancelScheduledMessage(sm.id)} className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Character count */}
                    {messageText.length > 200 && (
                      <p className={`text-[9px] mt-1 text-end ${messageText.length > 2000 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {messageText.length}/2000
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* ═══ Info Panel ═══ */}
            {showInfoPanel && selectedConversation && (
              <ChatInfoPanel conv={selectedConv} messages={messages} isRTL={isRTL} language={language} onClose={() => setShowInfoPanel(false)} />
            )}
          </div>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
};

export default DashboardMessages;
