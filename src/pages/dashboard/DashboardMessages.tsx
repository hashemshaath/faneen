import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Send, Search, Check, CheckCheck, ArrowLeft, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

const DashboardMessages = () => {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

      // Fetch profiles for other participants
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

  // Send message
  const sendMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('messages').insert({
        conversation_id: selectedConversation!,
        sender_id: user!.id,
        content: messageText.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
    },
  });

  const handleSend = () => {
    if (!messageText.trim() || !selectedConversation) return;
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

  // Count unread per conversation
  const getUnreadCount = (conv: any) => {
    // We approximate - if the last message was not from current user and the conversation has recent activity
    // A more accurate version would need a separate query
    return 0; // simplified
  };

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
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
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

                {/* Input */}
                <div className="p-3 border-t border-border/50 bg-card">
                  <div className="flex gap-2">
                    <Input
                      value={messageText}
                      onChange={e => setMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={isRTL ? 'اكتب رسالتك...' : 'Type a message...'}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!messageText.trim() || sendMutation.isPending}
                      variant="hero"
                      size="icon"
                    >
                      <Send className="w-4 h-4" />
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
