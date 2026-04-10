import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Reply, Trash2, Send, User } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  profile?: { full_name: string | null; avatar_url: string | null } | null;
  replies?: Comment[];
}

interface BlogCommentsProps {
  postId: string;
}

export const BlogComments = ({ postId }: BlogCommentsProps) => {
  const { user } = useAuth();
  const { isRTL, language } = useLanguage();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['blog-comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      // Fetch profiles for all unique user_ids
      const userIds = [...new Set((data || []).map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }])
      );

      // Build tree
      const all: Comment[] = (data || []).map(c => ({
        ...c,
        profile: profileMap.get(c.user_id) || null,
        replies: [],
      }));

      const rootComments: Comment[] = [];
      const map = new Map<string, Comment>();
      all.forEach(c => map.set(c.id, c));
      all.forEach(c => {
        if (c.parent_id && map.has(c.parent_id)) {
          map.get(c.parent_id)!.replies!.push(c);
        } else {
          rootComments.push(c);
        }
      });

      return rootComments;
    },
  });

  const addComment = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const { error } = await supabase.from('blog_comments').insert({
        post_id: postId,
        user_id: user!.id,
        parent_id: parentId || null,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-comments', postId] });
      setNewComment('');
      setReplyTo(null);
      setReplyContent('');
      toast.success(isRTL ? 'تم إضافة التعليق' : 'Comment added');
    },
    onError: () => {
      toast.error(isRTL ? 'حدث خطأ' : 'Error adding comment');
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from('blog_comments').delete().eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-comments', postId] });
      toast.success(isRTL ? 'تم حذف التعليق' : 'Comment deleted');
    },
  });

  const totalCount = comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);

  const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => {
    const name = comment.profile?.full_name || (isRTL ? 'مستخدم' : 'User');
    const initials = name.slice(0, 2);
    const isOwn = user?.id === comment.user_id;

    return (
      <div className={`${depth > 0 ? (isRTL ? 'border-r-2' : 'border-l-2') + ' border-accent/20 pr-4 pl-0 rtl:pl-4 rtl:pr-0' : ''}`}>
        <div className="flex gap-3 py-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={comment.profile?.avatar_url || ''} />
            <AvatarFallback className="bg-accent/10 text-accent text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{name}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(comment.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                  year: 'numeric', month: 'short', day: 'numeric',
                })}
              </span>
            </div>
            <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap break-words">{comment.content}</p>
            <div className="flex items-center gap-2 mt-2">
              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-accent gap-1 px-2"
                  onClick={() => setReplyTo({ id: comment.id, name })}
                >
                  <Reply className="w-3.5 h-3.5" />
                  {isRTL ? 'رد' : 'Reply'}
                </Button>
              )}
              {isOwn && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1 px-2"
                  onClick={() => deleteComment.mutate(comment.id)}
                  disabled={deleteComment.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isRTL ? 'حذف' : 'Delete'}
                </Button>
              )}
            </div>

            {/* Inline reply form */}
            {replyTo?.id === comment.id && (
              <div className="mt-3 flex gap-2">
                <Textarea
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  placeholder={isRTL ? `رد على ${name}...` : `Reply to ${name}...`}
                  className="min-h-[60px] text-sm resize-none"
                  autoFocus
                />
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={!replyContent.trim() || addComment.isPending}
                    onClick={() => addComment.mutate({ content: replyContent.trim(), parentId: comment.id })}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground"
                    onClick={() => { setReplyTo(null); setReplyContent(''); }}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className={depth > 0 ? '' : (isRTL ? 'mr-6' : 'ml-6')}>
            {comment.replies.map(reply => (
              <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-10">
      <h3 className="font-heading font-bold text-lg flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-accent" />
        {isRTL ? 'التعليقات' : 'Comments'}
        {totalCount > 0 && (
          <span className="text-sm font-normal text-muted-foreground">({totalCount})</span>
        )}
      </h3>

      {/* Add comment form */}
      {user ? (
        <div className="mb-6 flex gap-3">
          <Textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder={isRTL ? 'اكتب تعليقك هنا...' : 'Write your comment...'}
            className="min-h-[80px] resize-none"
          />
          <Button
            className="self-end h-10 px-4 gap-2"
            disabled={!newComment.trim() || addComment.isPending}
            onClick={() => addComment.mutate({ content: newComment.trim() })}
          >
            <Send className="w-4 h-4" />
            {isRTL ? 'إرسال' : 'Send'}
          </Button>
        </div>
      ) : (
        <div className="mb-6 p-4 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
          <Link to="/auth" className="text-accent hover:underline font-medium">
            {isRTL ? 'سجّل دخولك للتعليق' : 'Sign in to comment'}
          </Link>
        </div>
      )}

      {/* Comments list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-8 h-8 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-4 w-3/4 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {isRTL ? 'لا توجد تعليقات بعد. كن أول من يعلّق!' : 'No comments yet. Be the first to comment!'}
        </p>
      ) : (
        <div className="divide-y divide-border/50">
          {comments.map(comment => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
};
