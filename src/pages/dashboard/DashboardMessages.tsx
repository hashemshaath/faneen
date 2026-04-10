import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Upload, Sparkles, Reply, Smile, Phone, Video, MoreVertical, Pin, Trash2,
  Clock, SearchIcon, ChevronDown,
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday, isSameDay } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { MessageTemplates } from '@/components/messages/MessageTemplates';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'];

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

/* ─── Attachment Preview ─── */
const AttachmentPreview = ({ url, type, name }: { url: string; type: string; name?: string }) => {
  const [showPdf, setShowPdf] = React.useState(false);
  const isImage = IMAGE_TYPES.some(t => url.toLowerCase().includes(t.split('/')[1]) || type === t);
  const inferredImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
  const isPdf = /\.pdf(\?|$)/i.test(url) || type === 'application/pdf';

  if (isImage || inferredImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-1.5">
        <img src={url} alt={name || 'attachment'} className="max-w-[240px] max-h-[200px] rounded-lg object-cover border border-border/30" loading="lazy" />
      </a>
    );
  }
  if (isPdf) {
    return (
      <div className="mt-1.5 max-w-[300px]">
        {showPdf && (
          <div className="mb-1.5 rounded-lg overflow-hidden border border-border/30 bg-background">
            <iframe src={`${url}#toolbar=0&navpanes=0`} className="w-full h-[280px] rounded-lg" title={name || 'PDF'} />
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowPdf(!showPdf)} className="flex items-center gap-1.5 p-2 rounded-lg bg-background/50 border border-border/30 hover:bg-muted/50 transition-colors flex-1 min-w-0">
            <FileText className="w-5 h-5 text-red-500 shrink-0" />
            <span className="text-xs truncate flex-1 text-start">{name || 'PDF'}</span>
            <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
          <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-background/50 border border-border/30 hover:bg-muted/50 transition-colors shrink-0">
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-1.5 p-2 rounded-lg bg-background/50 border border-border/30 hover:bg-muted/50 transition-colors max-w-[240px]">
      <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
      <span className="text-xs truncate flex-1">{name || 'ملف مرفق'}</span>
      <Download className="w-4 h-4 text-muted-foreground shrink-0" />
    </a>
  );
};

/* ─── Main Component ─── */
const DashboardMessages = () => {
  const { isRTL, language } = useLanguage();
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [chatSearchTerm, setChatSearchTerm] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);

  const dragCounter = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  /* ─── Drag & Drop ─── */
  const handleDragFile = (file: File) => {
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
  };

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounter.current++; if (e.dataTransfer.types.includes('Files')) setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounter.current--; if (dragCounter.current === 0) setIsDragging(false); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); dragCounter.current = 0; const file = e.dataTransfer.files?.[0]; if (file) handleDragFile(file); };

  /* ─── Fetch Conversations ─── */
  const { data: conversations = [] } = useQuery({
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

  /* ─── Unread counts per conversation ─── */
  const { data: unreadCounts = {} } = useQuery({
    queryKey: ['unread-counts', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('messages')
        .select('conversation_id')
        .eq('is_read', false)
        .neq('sender_id', user!.id);
      const counts: Record<string, number> = {};
      (data || []).forEach((m: any) => { counts[m.conversation_id] = (counts[m.conversation_id] || 0) + 1; });
      return counts;
    },
    enabled: !!user,
  });

  const totalUnread = useMemo(() => Object.values(unreadCounts).reduce((a: number, b: number) => a + b, 0), [unreadCounts]);

  /* ─── Fetch Messages ─── */
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedConversation],
    queryFn: async () => {
      const { data, error } = await supabase.from('messages').select('*').eq('conversation_id', selectedConversation!).order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedConversation,
    refetchInterval: 5000,
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

  /* ─── File handling ─── */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const removeAttachment = () => { setAttachedFile(null); setAttachedPreview(null); };

  const uploadFile = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'bin';
    const fileName = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('chat-attachments').upload(fileName, file, { contentType: file.type });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('chat-attachments').getPublicUrl(fileName);
    return urlData.publicUrl;
  };

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
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
    },
    onError: () => { setIsUploading(false); toast.error(isRTL ? 'فشل إرسال الرسالة' : 'Failed to send message'); },
  });

  const handleSend = () => { if ((!messageText.trim() && !attachedFile) || !selectedConversation) return; sendMutation.mutate(); };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  /* ─── Filter & Select ─── */
  const filteredConversations = conversations.filter((c: any) => !searchTerm || c.other_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
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

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)]">
        <div className="flex h-full border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm">

          {/* ═══ Conversations List ═══ */}
          <div className={`w-full md:w-[340px] lg:w-[360px] border-e border-border/50 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {/* Header */}
            <div className="p-3 border-b border-border/50 bg-card">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="font-heading font-bold text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-accent" />
                  {isRTL ? 'المحادثات' : 'Messages'}
                  {totalUnread > 0 && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5 min-w-[20px] justify-center">
                      {totalUnread}
                    </Badge>
                  )}
                </h2>
              </div>
              <div className="relative">
                <Search className="absolute top-2.5 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '10px' }} />
                <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={isRTL ? 'بحث في المحادثات...' : 'Search conversations...'} className="ps-9 h-9 text-sm bg-muted/30 border-border/30" />
              </div>
            </div>

            {/* List */}
            <ScrollArea className="flex-1">
              {filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-heading font-bold text-sm mb-1">{isRTL ? 'لا توجد محادثات بعد' : 'No conversations yet'}</p>
                  <p className="text-xs mb-4">{isRTL ? 'ابدأ التواصل مع مزودي الخدمة' : 'Start connecting with providers'}</p>
                  <div className="space-y-2 text-start bg-muted/30 rounded-lg p-3">
                    <p className="text-xs font-medium text-foreground mb-2">{isRTL ? '💡 نصائح للبدء:' : '💡 Tips to get started:'}</p>
                    <p className="text-xs">{isRTL ? '🔍 ابحث عن مزودي الخدمة من صفحة البحث' : '🔍 Find providers from search'}</p>
                    <p className="text-xs">{isRTL ? '💬 اضغط "تواصل مع المزود" في صفحة أي مزود' : '💬 Click "Contact" on any provider\'s page'}</p>
                    <p className="text-xs">{isRTL ? '📎 يمكنك إرسال صور وملفات PDF' : '📎 Send images and PDF files'}</p>
                  </div>
                  <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={() => navigate('/search')}>
                    <Search className="w-3.5 h-3.5" />
                    {isRTL ? 'ابحث عن مزود خدمة' : 'Find a provider'}
                  </Button>
                </div>
              ) : (
                filteredConversations.map((conv: any) => {
                  const isSelected = conv.id === selectedConversation;
                  const unread = (unreadCounts as Record<string, number>)[conv.id] || 0;
                  const timeAgo = conv.last_message_at
                    ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false, locale: language === 'ar' ? ar : enUS })
                    : '';

                  return (
                    <div
                      key={conv.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer transition-all border-b border-border/20 group
                        ${isSelected ? 'bg-accent/10 border-s-[3px] border-s-accent' : 'hover:bg-muted/40 border-s-[3px] border-s-transparent'}`}
                      onClick={() => setSelectedConversation(conv.id)}
                    >
                      <div className="relative">
                        <Avatar className="w-11 h-11 shrink-0 ring-2 ring-border/20">
                          <AvatarImage src={conv.other_profile?.avatar_url} />
                          <AvatarFallback className="bg-accent/10 text-accent font-bold text-sm">
                            {conv.other_profile?.full_name?.charAt(0) || '؟'}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`text-sm truncate ${unread > 0 ? 'font-bold text-foreground' : 'font-medium'}`}>
                            {conv.other_profile?.full_name || (isRTL ? 'مستخدم' : 'User')}
                          </h4>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
                          </div>
                        </div>
                        {isSuperAdmin && conv.participant_1_name && conv.participant_2_name && (
                          <span className="text-[10px] text-muted-foreground truncate block">
                            {conv.participant_1_name} ↔ {conv.participant_2_name}
                          </span>
                        )}
                        <div className="flex items-center justify-between mt-0.5">
                          <p className={`text-xs truncate ${unread > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                            {conv.last_message_text || (isRTL ? 'ابدأ المحادثة...' : 'Start chatting...')}
                          </p>
                          {unread > 0 && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0 h-[18px] min-w-[18px] justify-center shrink-0 ms-1">
                              {unread}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </ScrollArea>
          </div>

          {/* ═══ Chat Area ═══ */}
          <div
            className={`flex-1 flex flex-col relative ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}
            onDragEnter={selectedConversation ? handleDragEnter : undefined}
            onDragLeave={selectedConversation ? handleDragLeave : undefined}
            onDragOver={selectedConversation ? handleDragOver : undefined}
            onDrop={selectedConversation ? handleDrop : undefined}
          >
            {/* Drag overlay */}
            {isDragging && selectedConversation && (
              <div className="absolute inset-0 z-50 bg-accent/10 border-2 border-dashed border-accent rounded-xl flex items-center justify-center backdrop-blur-sm">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-accent mx-auto mb-2" />
                  <p className="font-heading font-bold text-accent">{isRTL ? 'أفلت الملف هنا' : 'Drop file here'}</p>
                  <p className="text-sm text-muted-foreground">{isRTL ? 'الحد الأقصى 10 ميجابايت' : 'Max 10MB'}</p>
                </div>
              </div>
            )}

            {!selectedConversation ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center max-w-xs">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-accent/10 flex items-center justify-center">
                    <MessageSquare className="w-10 h-10 text-accent/40" />
                  </div>
                  <p className="font-heading font-bold text-lg mb-1">{isRTL ? 'اختر محادثة' : 'Select a conversation'}</p>
                  <p className="text-sm">{isRTL ? 'اختر محادثة من القائمة لعرض الرسائل' : 'Choose a conversation to view messages'}</p>
                </div>
              </div>
            ) : (
              <>
                {/* ─── Chat Header ─── */}
                <div className="h-14 flex items-center gap-3 px-4 border-b border-border/50 bg-card shrink-0">
                  <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={() => setSelectedConversation(null)}>
                    <BackIcon className="w-5 h-5" />
                  </Button>
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarImage src={selectedConv?.other_profile?.avatar_url} />
                    <AvatarFallback className="bg-accent/10 text-accent font-bold text-xs">
                      {selectedConv?.other_profile?.full_name?.charAt(0) || '؟'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-bold text-sm truncate">{selectedConv?.other_profile?.full_name || (isRTL ? 'مستخدم' : 'User')}</h3>
                    <p className="text-[10px] text-muted-foreground">
                      {messages.length > 0
                        ? `${messages.length} ${isRTL ? 'رسالة' : 'messages'}`
                        : (isRTL ? 'لا توجد رسائل' : 'No messages')}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => { setShowChatSearch(!showChatSearch); setChatSearchTerm(''); }}>
                      <SearchIcon className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
                        <DropdownMenuItem onClick={() => navigate(`/business/${selectedConv?.other_profile?.username || ''}`)}>
                          <Eye className="w-4 h-4 me-2" />
                          {isRTL ? 'عرض الملف الشخصي' : 'View profile'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* ─── Chat Search Bar ─── */}
                {showChatSearch && (
                  <div className="px-3 py-2 border-b border-border/30 bg-muted/20 flex items-center gap-2">
                    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input
                      value={chatSearchTerm}
                      onChange={e => setChatSearchTerm(e.target.value)}
                      placeholder={isRTL ? 'بحث في الرسائل...' : 'Search messages...'}
                      className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-0"
                      autoFocus
                    />
                    {chatSearchTerm && (
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {filteredMessages.length} {isRTL ? 'نتيجة' : 'results'}
                      </span>
                    )}
                    <Button variant="ghost" size="icon" className="w-7 h-7 shrink-0" onClick={() => { setShowChatSearch(false); setChatSearchTerm(''); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* ─── Messages ─── */}
                <ScrollArea className="flex-1 px-4 py-2">
                  <div className="space-y-1">
                    {groupedMessages.map((group) => (
                      <React.Fragment key={group.date}>
                        {/* Date separator */}
                        <div className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px bg-border/40" />
                          <span className="text-[11px] text-muted-foreground font-medium bg-card px-3 py-1 rounded-full border border-border/30 shadow-sm">
                            {group.label}
                          </span>
                          <div className="flex-1 h-px bg-border/40" />
                        </div>

                        {group.messages.map((msg: any) => {
                          const isMine = msg.sender_id === user?.id;
                          const isReply = msg.content?.startsWith('↩️');
                          let replyPreview = '';
                          let mainContent = msg.content || '';
                          if (isReply) {
                            const parts = mainContent.split('\n\n');
                            replyPreview = parts[0].replace('↩️ ', '');
                            mainContent = parts.slice(1).join('\n\n');
                          }

                          return (
                            <div key={msg.id} className={`flex group/msg ${isMine ? 'justify-end' : 'justify-start'} mb-1.5`}>
                              {/* Actions (visible on hover) */}
                              {isMine && (
                                <div className="flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity me-1 self-center">
                                  <button onClick={() => setReplyTo(msg)} className="p-1 rounded hover:bg-muted/50 text-muted-foreground">
                                    <Reply className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}

                              <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm relative
                                ${isMine
                                  ? 'bg-primary text-primary-foreground rounded-ee-sm'
                                  : 'bg-muted rounded-es-sm'}`}
                              >
                                {/* Reply preview */}
                                {isReply && replyPreview && (
                                  <div className={`text-[11px] mb-1.5 pb-1.5 border-b ${isMine ? 'border-primary-foreground/20 text-primary-foreground/70' : 'border-border/40 text-muted-foreground'} flex items-center gap-1`}>
                                    <Reply className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{replyPreview}</span>
                                  </div>
                                )}
                                {/* Attachment */}
                                {msg.attachment_url && (
                                  <AttachmentPreview url={msg.attachment_url} type={msg.message_type} name={msg.content?.startsWith('📎') ? msg.content.slice(3) : undefined} />
                                )}
                                {/* Content */}
                                {mainContent && !mainContent.startsWith('📎') && (
                                  <p className="whitespace-pre-wrap break-words leading-relaxed">{mainContent}</p>
                                )}
                                {mainContent?.startsWith('📎') && !msg.attachment_url && (
                                  <p className="whitespace-pre-wrap break-words">{mainContent}</p>
                                )}
                                {/* Time & read */}
                                <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                                  <span className={`text-[10px] ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                                    {new Date(msg.created_at).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {isMine && (
                                    msg.is_read
                                      ? <CheckCheck className="w-3.5 h-3.5 text-primary-foreground/60" />
                                      : <Check className="w-3.5 h-3.5 text-primary-foreground/40" />
                                  )}
                                </div>
                              </div>

                              {/* Actions for others' messages */}
                              {!isMine && (
                                <div className="flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity ms-1 self-center">
                                  <button onClick={() => setReplyTo(msg)} className="p-1 rounded hover:bg-muted/50 text-muted-foreground">
                                    <Reply className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* ─── Reply Preview ─── */}
                {replyTo && (
                  <div className="px-3 pt-2 border-t border-border/30 bg-muted/20">
                    <div className="flex items-center gap-2 p-2 bg-card rounded-lg border border-border/30">
                      <Reply className="w-4 h-4 text-accent shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-accent font-medium">{isRTL ? 'رد على رسالة' : 'Replying to'}</p>
                        <p className="text-xs text-muted-foreground truncate">{replyTo.content?.substring(0, 80)}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0" onClick={() => setReplyTo(null)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ─── Attachment Preview ─── */}
                {attachedFile && (
                  <div className="px-3 pt-2 border-t border-border/30">
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                      {attachedPreview ? (
                        <img src={attachedPreview} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <FileText className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{attachedFile.name}</p>
                        <p className="text-[10px] text-muted-foreground">{formatFileSize(attachedFile.size)}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="w-7 h-7 shrink-0" onClick={removeAttachment}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ─── Input Area ─── */}
                <div className="p-3 border-t border-border/50 bg-card relative">
                  {showTemplates && (
                    <MessageTemplates onSelectTemplate={(content) => setMessageText(content)} onClose={() => setShowTemplates(false)} />
                  )}
                  <div className="flex gap-2 items-end">
                    <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" className="hidden" onChange={handleFileSelect} />
                    <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => fileInputRef.current?.click()} disabled={isUploading} title={isRTL ? 'إرفاق ملف' : 'Attach file'}>
                      <Paperclip className="w-4.5 h-4.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => setShowTemplates(!showTemplates)} title={isRTL ? 'قوالب الرسائل' : 'Message templates'}>
                      <Sparkles className="w-4.5 h-4.5" />
                    </Button>
                    <Input
                      value={messageText}
                      onChange={e => setMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={isRTL ? 'اكتب رسالتك...' : 'Type a message...'}
                      className="flex-1 bg-muted/30 border-border/30"
                      disabled={isUploading}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={(!messageText.trim() && !attachedFile) || sendMutation.isPending || isUploading}
                      variant="hero"
                      size="icon"
                      className="shrink-0 h-9 w-9"
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
