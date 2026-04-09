import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  MessageSquare, Send, Search, Check, CheckCheck, ArrowLeft, ArrowRight,
  Paperclip, Image as ImageIcon, FileText, X, Download, Loader2, Eye, ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const getFileIcon = (type: string) => {
  if (IMAGE_TYPES.includes(type)) return ImageIcon;
  return FileText;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const AttachmentPreview = ({ url, type, name }: { url: string; type: string; name?: string }) => {
  const [showPdf, setShowPdf] = React.useState(false);
  const isImage = IMAGE_TYPES.some(t => url.toLowerCase().includes(t.split('/')[1]) || type === t);
  const inferredImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
  const isPdf = /\.pdf(\?|$)/i.test(url) || type === 'application/pdf';

  if (isImage || inferredImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-1.5">
        <img
          src={url}
          alt={name || 'attachment'}
          className="max-w-[240px] max-h-[200px] rounded-lg object-cover border border-border/30"
          loading="lazy"
        />
      </a>
    );
  }

  if (isPdf) {
    return (
      <div className="mt-1.5 max-w-[300px]">
        {showPdf && (
          <div className="mb-1.5 rounded-lg overflow-hidden border border-border/30 bg-background">
            <iframe
              src={`${url}#toolbar=0&navpanes=0`}
              className="w-full h-[280px] rounded-lg"
              title={name || 'PDF'}
            />
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowPdf(!showPdf)}
            className="flex items-center gap-1.5 p-2 rounded-lg bg-background/50 border border-border/30 hover:bg-muted/50 transition-colors flex-1 min-w-0"
          >
            <FileText className="w-5 h-5 text-red-500 shrink-0" />
            <span className="text-xs truncate flex-1 text-start">{name || 'PDF'}</span>
            <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-background/50 border border-border/30 hover:bg-muted/50 transition-colors shrink-0"
          >
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 mt-1.5 p-2 rounded-lg bg-background/50 border border-border/30 hover:bg-muted/50 transition-colors max-w-[240px]"
    >
      <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
      <span className="text-xs truncate flex-1">{name || 'ملف مرفق'}</span>
      <Download className="w-4 h-4 text-muted-foreground shrink-0" />
    </a>
  );
};

const DashboardMessages = () => {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch conversations with participant profiles
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1.eq.${user!.id},participant_2.eq.${user!.id}`)
        .order('last_message_at', { ascending: false });
      if (error) throw error;

      const otherIds = data.map((c: any) =>
        c.participant_1 === user!.id ? c.participant_2 : c.participant_1
      );
      const uniqueIds = [...new Set(otherIds)];

      if (uniqueIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', uniqueIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        return data.map((c: any) => {
          const otherId = c.participant_1 === user!.id ? c.participant_2 : c.participant_1;
          return { ...c, other_profile: profileMap.get(otherId) || { full_name: isRTL ? 'مستخدم' : 'User' } };
        });
      }
      return data.map((c: any) => ({ ...c, other_profile: { full_name: isRTL ? 'مستخدم' : 'User' } }));
    },
    enabled: !!user,
  });

  // Fetch messages for selected conversation
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedConversation],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConversation!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedConversation,
    refetchInterval: 5000,
  });

  // Realtime messages
  useEffect(() => {
    if (!selectedConversation) return;
    const channel = supabase
      .channel(`messages-${selectedConversation}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${selectedConversation}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation] });
        queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConversation, user?.id, queryClient]);

  // Mark messages as read
  useEffect(() => {
    if (!selectedConversation || !user) return;
    const unread = messages.filter((m: any) => !m.is_read && m.sender_id !== user.id);
    if (unread.length > 0) {
      supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', selectedConversation)
        .neq('sender_id', user.id)
        .eq('is_read', false)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
        });
    }
  }, [messages, selectedConversation, user, queryClient]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    setAttachedPreview(null);
  };

  // Upload file to storage
  const uploadFile = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'bin';
    const fileName = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from('chat-attachments')
      .upload(fileName, file, { contentType: file.type });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  // Send message
  const sendMutation = useMutation({
    mutationFn: async () => {
      setIsUploading(true);
      let attachmentUrl: string | null = null;
      let msgType = 'text';

      if (attachedFile) {
        attachmentUrl = await uploadFile(attachedFile);
        msgType = IMAGE_TYPES.includes(attachedFile.type) ? 'image' : 'file';
      }

      const content = messageText.trim() || (attachedFile
        ? (isRTL ? `📎 ${attachedFile.name}` : `📎 ${attachedFile.name}`)
        : '');

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
      setIsUploading(false);
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
    },
    onError: () => {
      setIsUploading(false);
      toast.error(isRTL ? 'فشل إرسال الرسالة' : 'Failed to send message');
    },
  });

  const handleSend = () => {
    if ((!messageText.trim() && !attachedFile) || !selectedConversation) return;
    sendMutation.mutate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const filteredConversations = conversations.filter((c: any) =>
    !searchTerm || c.other_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedConv = conversations.find((c: any) => c.id === selectedConversation);
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)]">
        <div className="flex h-full border border-border/50 rounded-xl overflow-hidden bg-card">
          {/* Conversations List */}
          <div className={`w-full md:w-80 border-e border-border/50 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-3 border-b border-border/50">
              <h2 className="font-heading font-bold text-lg mb-2 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gold" />
                {isRTL ? 'المحادثات' : 'Messages'}
              </h2>
              <div className="relative">
                <Search className="absolute top-2.5 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '10px' }} />
                <Input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder={isRTL ? 'بحث...' : 'Search...'}
                  className="ps-9 h-9 text-sm"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  {isRTL ? 'لا توجد محادثات' : 'No conversations'}
                </div>
              ) : (
                filteredConversations.map((conv: any) => {
                  const isSelected = conv.id === selectedConversation;
                  const timeAgo = conv.last_message_at
                    ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: language === 'ar' ? ar : enUS })
                    : '';

                  return (
                    <div
                      key={conv.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/30 ${isSelected ? 'bg-primary/5 border-s-2 border-s-gold' : ''}`}
                      onClick={() => setSelectedConversation(conv.id)}
                    >
                      <Avatar className="w-10 h-10 shrink-0">
                        <AvatarImage src={conv.other_profile?.avatar_url} />
                        <AvatarFallback className="bg-gold/10 text-gold font-bold text-sm">
                          {conv.other_profile?.full_name?.charAt(0) || '؟'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm truncate">{conv.other_profile?.full_name || (isRTL ? 'مستخدم' : 'User')}</h4>
                          <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {conv.last_message_text || (isRTL ? 'ابدأ المحادثة...' : 'Start chatting...')}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {!selectedConversation ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="font-heading font-bold">{isRTL ? 'اختر محادثة' : 'Select a conversation'}</p>
                  <p className="text-sm mt-1">{isRTL ? 'اختر محادثة من القائمة لعرض الرسائل' : 'Choose a conversation to view messages'}</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="h-14 flex items-center gap-3 px-4 border-b border-border/50 bg-card">
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConversation(null)}>
                    <BackIcon className="w-5 h-5" />
                  </Button>
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={selectedConv?.other_profile?.avatar_url} />
                    <AvatarFallback className="bg-gold/10 text-gold font-bold text-xs">
                      {selectedConv?.other_profile?.full_name?.charAt(0) || '؟'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-heading font-bold text-sm">{selectedConv?.other_profile?.full_name || (isRTL ? 'مستخدم' : 'User')}</h3>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {messages.map((msg: any) => {
                      const isMine = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${
                            isMine
                              ? 'bg-primary text-primary-foreground rounded-ee-md'
                              : 'bg-muted rounded-es-md'
                          }`}>
                            {/* Attachment */}
                            {msg.attachment_url && (
                              <AttachmentPreview
                                url={msg.attachment_url}
                                type={msg.message_type}
                                name={msg.content?.startsWith('📎') ? msg.content.slice(3) : undefined}
                              />
                            )}
                            {/* Text content (skip if it's just the file name placeholder) */}
                            {msg.content && !msg.content.startsWith('📎') && (
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            )}
                            {msg.content?.startsWith('📎') && !msg.attachment_url && (
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            )}
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
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Attachment Preview */}
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

                {/* Input */}
                <div className="p-3 border-t border-border/50 bg-card">
                  <div className="flex gap-2 items-end">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      title={isRTL ? 'إرفاق ملف' : 'Attach file'}
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>
                    <Input
                      value={messageText}
                      onChange={e => setMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={isRTL ? 'اكتب رسالتك...' : 'Type a message...'}
                      className="flex-1"
                      disabled={isUploading}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={(!messageText.trim() && !attachedFile) || sendMutation.isPending || isUploading}
                      variant="hero"
                      size="icon"
                      className="shrink-0"
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
