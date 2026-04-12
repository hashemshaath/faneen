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
  Upload, Sparkles, Reply, MoreVertical, Users, Clock, Archive, Smile, Mic, Pin,
  Star, Trash2, Forward, Copy, ChevronDown,
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { MessageTemplates } from '@/components/messages/MessageTemplates';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const EMOJI_QUICK = ['👍', '❤️', '😊', '👏', '🙏', '✅', '🎉', '💯'];

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
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="flex justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-2.5 w-10" />
          </div>
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
    ))}
  </div>
);

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
          <img src={url} alt={name || 'attachment'} className="max-w-[220px] max-h-[180px] object-cover transition-transform duration-300 group-hover/img:scale-105" loading="lazy" />
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
            <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5 text-red-500" />
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
const ConversationItem = React.memo(({ conv, isSelected, unread, isRTL, language, isSuperAdmin, onClick }: any) => {
  const timeAgo = conv.last_message_at
    ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false, locale: language === 'ar' ? ar : enUS })
    : '';

  return (
    <div
      className={`flex items-center gap-3 p-3 cursor-pointer transition-all duration-200 group relative
        ${isSelected
          ? 'bg-gradient-to-r from-accent/10 to-accent/5 border-s-[3px] border-s-accent shadow-sm'
          : 'hover:bg-muted/40 border-s-[3px] border-s-transparent'}`}
      onClick={onClick}
    >
      <div className="relative">
        <Avatar className={`w-10 h-10 shrink-0 ring-2 transition-all ${isSelected ? 'ring-accent/30' : 'ring-border/10 group-hover:ring-border/30'}`}>
          <AvatarImage src={conv.other_profile?.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-accent/20 to-primary/10 text-accent font-bold text-xs">
            {conv.other_profile?.full_name?.charAt(0) || '؟'}
          </AvatarFallback>
        </Avatar>
        {unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 w-3 h-3 bg-accent rounded-full border-2 border-card animate-pulse" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className={`text-sm truncate transition-colors ${unread > 0 ? 'font-bold text-foreground' : 'font-medium text-foreground/80'}`}>
            {conv.other_profile?.full_name || (isRTL ? 'مستخدم' : 'User')}
          </h4>
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
    </div>
  );
});
ConversationItem.displayName = 'ConversationItem';

/* ─── Message Bubble (memo) ─── */
const MessageBubble = React.memo(({ msg, isMine, language, isRTL, onReply, onCopy }: any) => {
  const isReply = msg.content?.startsWith('↩️');
  let replyPreview = '';
  let mainContent = msg.content || '';
  if (isReply) {
    const parts = mainContent.split('\n\n');
    replyPreview = parts[0].replace('↩️ ', '');
    mainContent = parts.slice(1).join('\n\n');
  }

  return (
    <div className={`flex group/msg ${isMine ? 'justify-end' : 'justify-start'} mb-1.5 animate-in fade-in-0 slide-in-from-bottom-1 duration-200`}>
      {/* Actions - mine */}
      {isMine && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-all me-1 self-center">
          <button onClick={() => onCopy?.(msg.content)} className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors" title={isRTL ? 'نسخ' : 'Copy'}>
            <Copy className="w-3 h-3" />
          </button>
          <button onClick={() => onReply(msg)} className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors" title={isRTL ? 'رد' : 'Reply'}>
            <Reply className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className={`max-w-[70%] relative group/bubble
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

      {/* Actions - other */}
      {!isMine && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-all ms-1 self-center">
          <button onClick={() => onReply(msg)} className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors" title={isRTL ? 'رد' : 'Reply'}>
            <Reply className="w-3 h-3" />
          </button>
          <button onClick={() => onCopy?.(msg.content)} className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors" title={isRTL ? 'نسخ' : 'Copy'}>
            <Copy className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
});
MessageBubble.displayName = 'MessageBubble';

/* ─── Emoji Quick Picker ─── */
const EmojiQuickPicker = React.memo(({ onSelect, isRTL }: { onSelect: (e: string) => void; isRTL: boolean }) => (
  <div className="absolute bottom-full mb-2 start-0 bg-card border border-border/40 rounded-xl shadow-xl p-2 flex gap-1 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
    {EMOJI_QUICK.map(e => (
      <button key={e} onClick={() => onSelect(e)} className="w-8 h-8 rounded-lg hover:bg-muted/60 flex items-center justify-center text-base transition-all hover:scale-110">
        {e}
      </button>
    ))}
  </div>
));
EmojiQuickPicker.displayName = 'EmojiQuickPicker';

/* ─── Main Component ─── */
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
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [convFilter, setConvFilter] = useState<'all' | 'unread'>('all');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

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

  /* ─── Drag & Drop ─── */
  const handleDragFile = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(isRTL ? 'حجم الملف يتجاوز 10 ميجابايت' : 'File size exceeds 10MB');
      return;
    }
    setAttachedFile(file);
    if (IMAGE_TYPES.includes(file.type)) {
      const reader = new FileReader();
      reader.onload = (ev) => setAttachedPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setAttachedPreview(null);
    }
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
      data.forEach((c: any) => { if (c.participant_1) allIds.add(c.participant_1); if (c.participant_2) allIds.add(c.participant_2); });
      allIds.delete(user!.id);

      if (allIds.size > 0) {
        const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', Array.from(allIds));
        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

        if (isSuperAdmin) {
          const { data: allProfiles } = await supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', Array.from(new Set(data.flatMap((c: any) => [c.participant_1, c.participant_2]))));
          (allProfiles || []).forEach((p: any) => { if (!profileMap.has(p.user_id)) profileMap.set(p.user_id, p); });
        }

        return data.map((c: any) => {
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
      return data.map((c: any) => ({ ...c, other_profile: { full_name: isRTL ? 'مستخدم' : 'User' } }));
    },
    enabled: !!user,
  });

  /* ─── Unread counts ─── */
  const { data: unreadCounts = {} } = useQuery({
    queryKey: ['unread-counts', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('messages').select('conversation_id').eq('is_read', false).neq('sender_id', user!.id);
      const counts: Record<string, number> = {};
      (data || []).forEach((m: any) => { counts[m.conversation_id] = (counts[m.conversation_id] || 0) + 1; });
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

  /* ─── Realtime: messages in selected conversation ─── */
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

  /* ─── Realtime: conversations list ─── */
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
  }, [user?.id, queryClient]);

  /* ─── Mark as read ─── */
  useEffect(() => {
    if (!selectedConversation || !user) return;
    const unread = messages.filter((m: any) => !m.is_read && m.sender_id !== user.id);
    if (unread.length > 0) {
      supabase.from('messages').update({ is_read: true }).eq('conversation_id', selectedConversation).neq('sender_id', user.id).eq('is_read', false).then(() => {
        queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
        queryClient.invalidateQueries({ queryKey: ['unread-counts', user.id] });
      });
    }
  }, [messages, selectedConversation, user, queryClient]);

  /* ─── Scroll to bottom ─── */
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  /* ─── Focus input when conversation selected ─── */
  useEffect(() => {
    if (selectedConversation) setTimeout(() => inputRef.current?.focus(), 100);
  }, [selectedConversation]);

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
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
    },
    onError: () => { setIsUploading(false); toast.error(isRTL ? 'فشل إرسال الرسالة' : 'Failed to send message'); },
  });

  const handleSend = useCallback(() => { if ((!messageText.trim() && !attachedFile) || !selectedConversation) return; sendMutation.mutate(); }, [messageText, attachedFile, selectedConversation, sendMutation]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }, [handleSend]);
  const handleReply = useCallback((msg: any) => { setReplyTo(msg); inputRef.current?.focus(); }, []);
  const handleCopy = useCallback((text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(isRTL ? 'تم النسخ' : 'Copied');
  }, [isRTL]);
  const handleEmojiSelect = useCallback((emoji: string) => {
    setMessageText(prev => prev + emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  }, []);

  /* ─── Filter & Select ─── */
  const filteredConversations = useMemo(() => {
    let result = conversations;
    if (deferredSearch) result = result.filter((c: any) => c.other_profile?.full_name?.toLowerCase().includes(deferredSearch.toLowerCase()));
    if (convFilter === 'unread') result = result.filter((c: any) => (unreadCounts as Record<string, number>)[c.id] > 0);
    return result;
  }, [conversations, deferredSearch, convFilter, unreadCounts]);

  const selectedConv = conversations.find((c: any) => c.id === selectedConversation);

  const filteredMessages = useMemo(() => {
    if (!chatSearchTerm) return messages;
    return messages.filter((m: any) => m.content?.toLowerCase().includes(chatSearchTerm.toLowerCase()));
  }, [messages, chatSearchTerm]);

  /* ─── Date-grouped messages ─── */
  const groupedMessages = useMemo(() => {
    const groups: { date: string; label: string; messages: any[] }[] = [];
    const source = chatSearchTerm ? filteredMessages : messages;
    source.forEach((msg: any) => {
      const d = new Date(msg.created_at);
      const dateKey = format(d, 'yyyy-MM-dd');
      const last = groups[groups.length - 1];
      if (last && last.date === dateKey) {
        last.messages.push(msg);
      } else {
        groups.push({ date: dateKey, label: getDateLabel(msg.created_at, language), messages: [msg] });
      }
    });
    return groups;
  }, [messages, filteredMessages, chatSearchTerm, language]);

  /* ─── Stats ─── */
  const stats = useMemo(() => ({
    total: conversations.length,
    unread: totalUnread,
  }), [conversations.length, totalUnread]);

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)]">
        {/* ─── Stats Bar ─── */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
          {[
            { icon: MessageSquare, label: isRTL ? 'المحادثات' : 'Conversations', value: stats.total, gradient: 'from-primary/15 to-primary/5', iconBg: 'bg-primary/15 text-primary' },
            { icon: Clock, label: isRTL ? 'غير مقروءة' : 'Unread', value: stats.unread, gradient: 'from-amber-500/15 to-amber-500/5', iconBg: 'bg-amber-500/15 text-amber-600' },
          ].map((s, i) => (
            <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border/30 bg-gradient-to-r ${s.gradient} shrink-0 transition-all hover:shadow-sm`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.iconBg}`}><s.icon className="w-4 h-4" /></div>
              <div>
                <p className="text-base font-bold leading-none">{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex h-[calc(100%-3.5rem)] border border-border/30 rounded-2xl overflow-hidden bg-card shadow-lg">
          {/* ═══ Conversations List ═══ */}
          <div className={`w-full md:w-[320px] lg:w-[340px] border-e border-border/30 flex flex-col bg-card ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {/* Header */}
            <div className="p-3 border-b border-border/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-bold text-base flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-accent" />
                  </div>
                  {isRTL ? 'المحادثات' : 'Messages'}
                  {totalUnread > 0 && (
                    <Badge className="text-[9px] px-1.5 py-0 h-4 min-w-[18px] justify-center bg-accent text-accent-foreground border-0 animate-pulse">{totalUnread}</Badge>
                  )}
                </h2>
                {/* Filter tabs */}
                <div className="flex bg-muted/50 border border-border/30 rounded-xl overflow-hidden p-0.5">
                  {[
                    { key: 'all' as const, icon: Users, label: isRTL ? 'الكل' : 'All' },
                    { key: 'unread' as const, icon: Archive, label: isRTL ? 'غير مقروء' : 'Unread' },
                  ].map(f => (
                    <button
                      key={f.key}
                      className={`px-2.5 py-1.5 text-[10px] font-medium transition-all rounded-lg flex items-center gap-1
                        ${convFilter === f.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setConvFilter(f.key)}
                    >
                      <f.icon className="w-3 h-3" />
                      <span className="hidden sm:inline">{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <Search className="absolute top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                <Input
                  value={searchTerm}
                  onChange={e => handleSearchChange(e.target.value)}
                  placeholder={isRTL ? 'بحث في المحادثات...' : 'Search conversations...'}
                  className="ps-9 h-9 text-xs bg-muted/30 border-border/20 rounded-xl focus:bg-background transition-colors"
                />
              </div>
            </div>

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
                    ].map((tip, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{tip.emoji}</span>
                        <span>{tip.text}</span>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="mt-4 gap-1.5 text-xs h-9 rounded-xl" onClick={() => navigate('/search')}>
                    <Search className="w-3.5 h-3.5" />{isRTL ? 'بحث عن مزودين' : 'Find Providers'}
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border/10">
                  {filteredConversations.map((conv: any) => (
                    <ConversationItem
                      key={conv.id}
                      conv={conv}
                      isSelected={conv.id === selectedConversation}
                      unread={(unreadCounts as Record<string, number>)[conv.id] || 0}
                      isRTL={isRTL}
                      language={language}
                      isSuperAdmin={isSuperAdmin}
                      onClick={() => setSelectedConversation(conv.id)}
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
                  <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-accent/15 to-primary/10 flex items-center justify-center">
                    <MessageSquare className="w-10 h-10 text-accent/30" />
                  </div>
                  <p className="font-heading font-bold text-lg mb-1.5">{isRTL ? 'مرحباً بك في المحادثات' : 'Welcome to Messages'}</p>
                  <p className="text-sm text-muted-foreground">{isRTL ? 'اختر محادثة من القائمة أو ابدأ محادثة جديدة' : 'Select a conversation or start a new one'}</p>
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
                    <span className="absolute -bottom-0.5 -end-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-bold text-sm truncate">{selectedConv?.other_profile?.full_name || (isRTL ? 'مستخدم' : 'User')}</h3>
                    <p className="text-[10px] text-emerald-500 font-medium">
                      {isRTL ? 'متصل الآن' : 'Online'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-xl" onClick={() => { setShowChatSearch(!showChatSearch); setChatSearchTerm(''); }}>
                      <Search className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-xl"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="rounded-xl">
                        <DropdownMenuItem onClick={() => navigate(`/${selectedConv?.other_profile?.username || ''}`)} className="rounded-lg">
                          <Eye className="w-3.5 h-3.5 me-2" />{isRTL ? 'عرض الملف الشخصي' : 'View profile'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="rounded-lg text-muted-foreground">
                          <Pin className="w-3.5 h-3.5 me-2" />{isRTL ? 'تثبيت المحادثة' : 'Pin conversation'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* ─── Chat Search Bar ─── */}
                {showChatSearch && (
                  <div className="px-4 py-2 border-b border-border/20 bg-card/60 backdrop-blur-sm flex items-center gap-2 animate-in slide-in-from-top-1 duration-200">
                    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input value={chatSearchTerm} onChange={e => setChatSearchTerm(e.target.value)}
                      placeholder={isRTL ? 'بحث في الرسائل...' : 'Search messages...'}
                      className="h-8 text-xs border-0 bg-transparent shadow-none focus-visible:ring-0 rounded-xl" autoFocus />
                    {chatSearchTerm && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 shrink-0 rounded-md">{filteredMessages.length}</Badge>
                    )}
                    <Button variant="ghost" size="icon" className="w-7 h-7 shrink-0 rounded-lg" onClick={() => { setShowChatSearch(false); setChatSearchTerm(''); }}>
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
                          {group.messages.map((msg: any) => (
                            <MessageBubble key={msg.id} msg={msg} isMine={msg.sender_id === user?.id} language={language} isRTL={isRTL} onReply={handleReply} onCopy={handleCopy} />
                          ))}
                        </React.Fragment>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* ─── Scroll to bottom button ─── */}
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
                      <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground" onClick={() => { setShowEmoji(!showEmoji); setShowTemplates(false); }}>
                        <Smile className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 rounded-xl text-muted-foreground hover:text-accent" onClick={() => { setShowTemplates(!showTemplates); setShowEmoji(false); }}>
                        <Sparkles className="w-4 h-4" />
                      </Button>
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
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardMessages;
