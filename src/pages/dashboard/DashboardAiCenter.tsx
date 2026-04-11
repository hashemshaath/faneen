import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAiSettings, DEFAULT_AI_SETTINGS, type ToneType, type AiModel, type AiSettings, type ResponseStyle } from '@/hooks/useAiSettings';
import {
  Languages, Sparkles, Wand2, Bot, Send, Copy, RotateCcw, ArrowLeftRight,
  Loader2, CheckCircle2, Zap, Brain, MessageSquare, FileText, Type,
  Palette, Settings2, BookOpen, Lightbulb,
  Volume2, Shield, ChevronDown, ChevronUp, Star, Download, Trash2,
  Clock, Hash, BarChart3, ArrowRight, ArrowLeft,
  Upload, Globe, Plus, X, Database, GraduationCap, Eye, EyeOff,
  FilePlus, BookMarked, Sliders, Save, AlertCircle,
  PenTool, Newspaper, Target, TrendingUp, Award, Puzzle, RefreshCw,
  Search, ListChecks, Layers, Link2, Rocket, Briefcase, Users, Cog,
} from 'lucide-react';

/* ═══════════════════ Types ═══════════════════ */
interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string; timestamp: Date; }
interface HistoryEntry { id: string; action: string; input: string; output: string; timestamp: Date; model: string; tone: string; }
interface KnowledgeEntry { id: string; title: string; content: string; source_type: string; source_name: string | null; tags: string[]; is_active: boolean; char_count: number; created_at: string; }

/* ═══════════════════ Constants ═══════════════════ */
const TONES: { key: ToneType; ar: string; en: string; icon: React.ElementType; desc_ar: string; desc_en: string }[] = [
  { key: 'formal', ar: 'رسمي', en: 'Formal', icon: Shield, desc_ar: 'مناسب للمراسلات الرسمية', desc_en: 'For official communications' },
  { key: 'casual', ar: 'عامي', en: 'Casual', icon: MessageSquare, desc_ar: 'ودي وبسيط', desc_en: 'Friendly and simple' },
  { key: 'marketing', ar: 'تسويقي', en: 'Marketing', icon: Zap, desc_ar: 'جذاب ومقنع', desc_en: 'Engaging and persuasive' },
  { key: 'academic', ar: 'أكاديمي', en: 'Academic', icon: BookOpen, desc_ar: 'علمي ودقيق', desc_en: 'Scientific and precise' },
  { key: 'creative', ar: 'إبداعي', en: 'Creative', icon: Palette, desc_ar: 'مبتكر ومميز', desc_en: 'Innovative with unique style' },
  { key: 'technical', ar: 'تقني', en: 'Technical', icon: Settings2, desc_ar: 'دقيق وتخصصي', desc_en: 'Precise for technical content' },
];

const MODELS: { key: AiModel; label: string; desc_ar: string; desc_en: string; tier: 'fast' | 'mid' | 'pro' }[] = [
  { key: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash', desc_ar: 'سريع ومتوازن', desc_en: 'Fast & balanced', tier: 'fast' },
  { key: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc_ar: 'اقتصادي وفعال', desc_en: 'Economic & efficient', tier: 'fast' },
  { key: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', desc_ar: 'أعلى جودة', desc_en: 'Highest quality', tier: 'pro' },
  { key: 'openai/gpt-5-mini', label: 'GPT-5 Mini', desc_ar: 'متوازن وقوي', desc_en: 'Balanced & strong', tier: 'mid' },
  { key: 'openai/gpt-5', label: 'GPT-5', desc_ar: 'الأقوى', desc_en: 'Most powerful', tier: 'pro' },
];

const QUICK_TOOLS = [
  { key: 'summarize', ar: 'تلخيص', en: 'Summarize', icon: FileText, desc_ar: 'اختصر النص', desc_en: 'Condense text' },
  { key: 'expand', ar: 'توسيع', en: 'Expand', icon: Type, desc_ar: 'أضف تفاصيل', desc_en: 'Add details' },
  { key: 'proofread', ar: 'تدقيق لغوي', en: 'Proofread', icon: CheckCircle2, desc_ar: 'صحح الأخطاء', desc_en: 'Fix errors' },
  { key: 'rewrite', ar: 'إعادة صياغة', en: 'Rewrite', icon: RotateCcw, desc_ar: 'أعد الكتابة', desc_en: 'Rewrite' },
  { key: 'bullet_points', ar: 'نقاط رئيسية', en: 'Bullet Points', icon: Lightbulb, desc_ar: 'استخرج النقاط', desc_en: 'Extract points' },
  { key: 'headline', ar: 'عناوين جذابة', en: 'Headlines', icon: Star, desc_ar: 'ولّد عناوين', desc_en: 'Generate titles' },
];

const BLOG_TOOLS = [
  { key: 'blog_title', ar: 'عناوين مقالات', en: 'Blog Titles', icon: Newspaper, desc_ar: 'عناوين مقالات جذابة', desc_en: 'Engaging blog titles' },
  { key: 'blog_outline', ar: 'هيكل مقال', en: 'Outline', icon: ListChecks, desc_ar: 'هيكل مقال منظم', desc_en: 'Article structure' },
  { key: 'blog_intro', ar: 'مقدمة مقال', en: 'Intro', icon: PenTool, desc_ar: 'مقدمة جذابة', desc_en: 'Compelling intro' },
  { key: 'seo_keywords', ar: 'كلمات SEO', en: 'SEO Keywords', icon: Search, desc_ar: 'كلمات مفتاحية', desc_en: 'SEO keywords' },
  { key: 'meta_description', ar: 'وصف ميتا', en: 'Meta Desc', icon: Target, desc_ar: 'وصف ميتا احترافي', desc_en: 'Meta description' },
  { key: 'social_post', ar: 'منشور تسويقي', en: 'Social Post', icon: TrendingUp, desc_ar: 'محتوى تسويقي', desc_en: 'Social content' },
];

const TRAINING_PRESETS = [
  { key: 'customer_service', ar: 'خدمة العملاء', en: 'Customer Service', icon: Users, prompt_ar: 'أنت مساعد خدمة عملاء محترف. أجب بلطف ووضوح، واحل مشاكل العملاء بكفاءة.', prompt_en: 'You are a professional customer service assistant. Answer politely and clearly.', desc_ar: 'أسلوب خدمة العملاء', desc_en: 'Customer service style' },
  { key: 'sales_expert', ar: 'خبير مبيعات', en: 'Sales Expert', icon: Briefcase, prompt_ar: 'أنت خبير مبيعات محترف. ساعد في كتابة عروض مقنعة بأسلوب تسويقي جذاب.', prompt_en: 'You are a professional sales expert. Help write persuasive offers.', desc_ar: 'أسلوب البيع الاحترافي', desc_en: 'Professional sales' },
  { key: 'content_writer', ar: 'كاتب محتوى', en: 'Content Writer', icon: PenTool, prompt_ar: 'أنت كاتب محتوى محترف. اكتب محتوى جذاب ومحسّن لمحركات البحث.', prompt_en: 'You are a professional content writer. Write engaging SEO-optimized content.', desc_ar: 'كتابة المحتوى', desc_en: 'Content writing' },
  { key: 'technical_support', ar: 'دعم فني', en: 'Tech Support', icon: Settings2, prompt_ar: 'أنت فني دعم متخصص. اشرح الحلول التقنية بلغة بسيطة مع خطوات واضحة.', prompt_en: 'You are a technical support specialist. Explain solutions simply.', desc_ar: 'دعم فني', desc_en: 'Tech support' },
  { key: 'project_manager', ar: 'مدير مشاريع', en: 'Project Manager', icon: Layers, prompt_ar: 'أنت مدير مشاريع خبير. ساعد في التخطيط وتنظيم المهام بأسلوب مهني.', prompt_en: 'You are an expert project manager. Help plan and organize professionally.', desc_ar: 'إدارة المشاريع', desc_en: 'Project management' },
  { key: 'marketing_guru', ar: 'خبير تسويق', en: 'Marketing Guru', icon: Rocket, prompt_ar: 'أنت خبير تسويق رقمي. ساعد في إنشاء حملات تسويقية ومحتوى إعلاني جذاب.', prompt_en: 'You are a digital marketing expert. Help create campaigns and ad copy.', desc_ar: 'التسويق الرقمي', desc_en: 'Digital marketing' },
];

const SMART_SUGGESTIONS = [
  { ar: 'حلل محتوى منافسيّ', en: 'Analyze competitor content', icon: Target },
  { ar: 'اكتب خطة محتوى شهرية', en: 'Write monthly content plan', icon: Newspaper },
  { ar: 'حسّن وصف خدماتي', en: 'Optimize service descriptions', icon: Search },
  { ar: 'اقترح عناوين مشاريع', en: 'Suggest project titles', icon: Award },
  { ar: 'اكتب رسالة متابعة للعميل', en: 'Write client follow-up', icon: MessageSquare },
  { ar: 'ساعدني بكتابة عرض سعر', en: 'Help write a price quote', icon: Briefcase },
];

const TIER_COLORS: Record<string, string> = {
  fast: 'border-emerald-500/50 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
  mid: 'border-blue-500/50 text-blue-600 bg-blue-50 dark:bg-blue-950/30',
  pro: 'border-amber-500/50 text-amber-600 bg-amber-50 dark:bg-amber-950/30',
};

/* ═══════════════════ Helpers ═══════════════════ */
const uid = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2);
const wordCount = (t: string) => t.split(/\s+/).filter(Boolean).length;

async function callAiCenter(params: Record<string, any>): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ai-center', { body: params });
  if (error) {
    const msg = error.message || '';
    if (msg.includes('429')) toast.error('تم تجاوز الحد، حاول لاحقاً');
    else if (msg.includes('402')) toast.error('الرصيد غير كافٍ');
    else toast.error(msg || 'AI Error');
    throw error;
  }
  return data?.result || '';
}

const StatPill: React.FC<{ icon: React.ElementType; value: string | number; label: string }> = ({ icon: Icon, value, label }) => (
  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
    <Icon className="w-3 h-3" /><span className="font-medium tabular-nums tech-content">{value}</span><span>{label}</span>
  </div>
);

/* ═══════════════════ Main Component ═══════════════════ */
const DashboardAiCenter: React.FC = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const t = useCallback((ar: string, en: string) => isRTL ? ar : en, [isRTL]);
  const dirClass = isRTL ? 'rtl' : 'ltr';

  // Central AI Settings
  const { settings: aiSettings, save: saveAiSettings, reload: reloadSettings, invalidate } = useAiSettings();
  const [localSettings, setLocalSettings] = useState<AiSettings>(aiSettings);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);

  useEffect(() => { setLocalSettings(aiSettings); }, [aiSettings]);

  const updateLocal = useCallback(<K extends keyof AiSettings>(key: K, val: AiSettings[K]) => {
    setLocalSettings(s => ({ ...s, [key]: val }));
    setSettingsDirty(true);
  }, []);

  const handleSaveSettings = async () => {
    setSettingsLoading(true);
    try {
      // Save to DB via hook
      await saveAiSettings(localSettings);
      // Also save the new columns directly
      if (user) {
        await supabase.from('ai_assistant_settings').upsert({
          user_id: user.id,
          system_prompt: localSettings.system_prompt,
          response_style: localSettings.response_style,
          language_preference: localSettings.language_preference,
          include_knowledge: localSettings.include_knowledge,
          max_knowledge_entries: localSettings.max_knowledge_entries,
          default_tone: localSettings.default_tone,
          default_model: localSettings.default_model,
          translation_instructions: localSettings.translation_instructions,
          content_instructions: localSettings.content_instructions,
        } as any, { onConflict: 'user_id' });
      }
      invalidate();
      await reloadSettings();
      setSettingsDirty(false);
      toast.success(t('تم حفظ الإعدادات المركزية', 'Central settings saved'));
    } catch { toast.error(t('فشل الحفظ', 'Save failed')); }
    finally { setSettingsLoading(false); }
  };

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState('hub');

  // Translation
  const [transSource, setTransSource] = useState('');
  const [transResult, setTransResult] = useState('');
  const [transDir, setTransDir] = useState<'ar2en' | 'en2ar'>('ar2en');
  const [transLoading, setTransLoading] = useState(false);

  // Tools
  const [toolInput, setToolInput] = useState('');
  const [toolResult, setToolResult] = useState('');
  const [toolLoading, setToolLoading] = useState<string | null>(null);
  const [lastToolUsed, setLastToolUsed] = useState<string | null>(null);

  // Blog tools
  const [blogInput, setBlogInput] = useState('');
  const [blogResult, setBlogResult] = useState('');
  const [blogLoading, setBlogLoading] = useState<string | null>(null);
  const [lastBlogTool, setLastBlogTool] = useState<string | null>(null);
  const [reverseTranslateLoading, setReverseTranslateLoading] = useState(false);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Knowledge Base
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [showAddKnowledge, setShowAddKnowledge] = useState(false);
  const [addSourceType, setAddSourceType] = useState<'text' | 'file' | 'url'>('text');
  const [addTitle, setAddTitle] = useState('');
  const [addContent, setAddContent] = useState('');
  const [addUrl, setAddUrl] = useState('');
  const [addTags, setAddTags] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeKnowledgeCount = useMemo(() => knowledgeEntries.filter(k => k.is_active).length, [knowledgeEntries]);
  const totalKnowledgeChars = useMemo(() => knowledgeEntries.filter(k => k.is_active).reduce((s, k) => s + k.char_count, 0), [knowledgeEntries]);

  const activeTone = useMemo(() => TONES.find(tt => tt.key === localSettings.default_tone)!, [localSettings.default_tone]);
  const activeModel = useMemo(() => MODELS.find(m => m.key === localSettings.default_model)!, [localSettings.default_model]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, chatLoading]);
  useEffect(() => { if (!user) return; loadKnowledge(); }, [user]);

  const loadKnowledge = async () => {
    const { data } = await supabase.from('ai_knowledge_entries').select('*').order('created_at', { ascending: false });
    if (data) setKnowledgeEntries(data as any);
  };

  const addHistory = useCallback((action: string, input: string, output: string) => {
    setHistory(prev => [{ id: uid(), action, input: input.slice(0, 100), output: output.slice(0, 100), timestamp: new Date(), model: localSettings.default_model, tone: localSettings.default_tone }, ...prev].slice(0, 50));
  }, [localSettings.default_model, localSettings.default_tone]);

  const copyText = useCallback((text: string) => { navigator.clipboard.writeText(text); toast.success(t('تم النسخ', 'Copied')); }, [t]);
  const exportText = useCallback((text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }, []);

  const getKnowledgeContext = useCallback(() => {
    if (!localSettings.include_knowledge) return '';
    const active = knowledgeEntries.filter(k => k.is_active).slice(0, localSettings.max_knowledge_entries);
    if (!active.length) return '';
    return active.map(k => `[${k.title}]:\n${k.content.slice(0, 2000)}`).join('\n\n---\n\n');
  }, [knowledgeEntries, localSettings]);

  /* ─── Knowledge CRUD ─── */
  const handleAddKnowledge = async () => {
    if (!user || !addTitle.trim()) return;
    let content = addContent;
    if (addSourceType === 'url' && addUrl.trim()) {
      setAddLoading(true);
      try { content = await callAiCenter({ action: 'extract_from_url', text: `Extract content from: ${addUrl}`, model: localSettings.default_model }); }
      catch { setAddLoading(false); return; }
    }
    if (!content.trim()) { toast.error(t('المحتوى مطلوب', 'Content is required')); return; }
    setAddLoading(true);
    try {
      const { error } = await supabase.from('ai_knowledge_entries').insert({
        user_id: user.id, title: addTitle, content, source_type: addSourceType,
        source_name: addSourceType === 'url' ? addUrl : addSourceType === 'file' ? 'uploaded file' : null,
        tags: addTags ? addTags.split(',').map(t => t.trim()).filter(Boolean) : [], char_count: content.length,
      });
      if (error) throw error;
      toast.success(t('تمت الإضافة', 'Added'));
      setAddTitle(''); setAddContent(''); setAddUrl(''); setAddTags(''); setShowAddKnowledge(false); loadKnowledge();
    } catch { toast.error(t('فشلت الإضافة', 'Failed')); }
    finally { setAddLoading(false); }
  };

  const toggleKnowledge = async (id: string, active: boolean) => {
    await supabase.from('ai_knowledge_entries').update({ is_active: active }).eq('id', id);
    setKnowledgeEntries(prev => prev.map(k => k.id === id ? { ...k, is_active: active } : k));
  };

  const deleteKnowledge = async (id: string) => {
    await supabase.from('ai_knowledge_entries').delete().eq('id', id);
    setKnowledgeEntries(prev => prev.filter(k => k.id !== id));
    toast.success(t('تم الحذف', 'Deleted'));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error(t('الحد الأقصى 2MB', 'Max 2MB')); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { const text = ev.target?.result as string; setAddContent(text); if (!addTitle) setAddTitle(file.name.replace(/\.[^.]+$/, '')); };
    reader.readAsText(file);
  };

  /* ─── Translation ─── */
  const handleTranslate = useCallback(async () => {
    if (!transSource.trim()) return;
    setTransLoading(true);
    try {
      const result = await callAiCenter({
        action: 'translate', text: transSource,
        sourceLang: transDir === 'ar2en' ? 'ar' : 'en', targetLang: transDir === 'ar2en' ? 'en' : 'ar',
        tone: localSettings.default_tone, model: localSettings.default_model,
      });
      setTransResult(result); addHistory('translate', transSource, result);
    } catch {} finally { setTransLoading(false); }
  }, [transSource, transDir, localSettings, addHistory]);

  const swapTranslation = useCallback(() => {
    setTransDir(d => d === 'ar2en' ? 'en2ar' : 'ar2en'); setTransSource(transResult); setTransResult(transSource);
  }, [transSource, transResult]);

  /* ─── Tools ─── */
  const handleTool = useCallback(async (toolKey: string) => {
    if (!toolInput.trim()) return;
    setToolLoading(toolKey); setLastToolUsed(toolKey);
    try {
      const result = await callAiCenter({ action: toolKey === 'improve' ? 'improve' : toolKey, text: toolInput, tone: localSettings.default_tone, model: localSettings.default_model, responseStyle: localSettings.response_style });
      setToolResult(result); addHistory(toolKey, toolInput, result);
    } catch {} finally { setToolLoading(null); }
  }, [toolInput, localSettings, addHistory]);

  /* ─── Blog Tools ─── */
  const handleBlogTool = useCallback(async (toolKey: string) => {
    if (!blogInput.trim()) return;
    setBlogLoading(toolKey); setLastBlogTool(toolKey);
    const prompts: Record<string, string> = {
      blog_title: `Generate 5 compelling blog titles for:\n${blogInput}`,
      blog_outline: `Create a detailed article outline for:\n${blogInput}`,
      blog_intro: `Write a compelling introduction (150-200 words) for:\n${blogInput}`,
      seo_keywords: `Extract 10-15 SEO keywords from:\n${blogInput}`,
      meta_description: `Write an SEO meta description (150-160 chars) for:\n${blogInput}`,
      social_post: `Convert to social media post with hashtags:\n${blogInput}`,
    };
    try {
      const result = await callAiCenter({ action: 'chat', text: prompts[toolKey] || blogInput, tone: localSettings.default_tone, model: localSettings.default_model, responseStyle: localSettings.response_style });
      setBlogResult(result); addHistory(`blog:${toolKey}`, blogInput, result);
    } catch {} finally { setBlogLoading(null); }
  }, [blogInput, localSettings, addHistory]);

  const handleReverseTranslate = useCallback(async () => {
    if (!blogResult.trim()) return;
    setReverseTranslateLoading(true);
    try {
      const detectLang = /[\u0600-\u06FF]/.test(blogResult) ? 'ar' : 'en';
      const result = await callAiCenter({ action: 'translate', text: blogResult, sourceLang: detectLang, targetLang: detectLang === 'ar' ? 'en' : 'ar', tone: localSettings.default_tone, model: localSettings.default_model });
      setBlogResult(prev => prev + '\n\n---\n\n' + result);
      toast.success(t('تمت الترجمة العكسية', 'Reverse translated'));
    } catch {} finally { setReverseTranslateLoading(false); }
  }, [blogResult, localSettings, t]);

  /* ─── Chat ─── */
  const handleChat = useCallback(async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { id: uid(), role: 'user', content: chatInput, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMsg]); setChatInput(''); setChatLoading(true);
    try {
      const knowledgeCtx = getKnowledgeContext();
      const result = await callAiCenter({
        action: 'chat', text: chatInput, model: localSettings.default_model, tone: localSettings.default_tone,
        context: chatMessages.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n'),
        knowledgeContext: knowledgeCtx || undefined,
        systemPromptOverride: localSettings.system_prompt || undefined, responseStyle: localSettings.response_style,
      });
      setChatMessages(prev => [...prev, { id: uid(), role: 'assistant', content: result, timestamp: new Date() }]);
    } catch {
      setChatMessages(prev => [...prev, { id: uid(), role: 'assistant', content: t('حدث خطأ.', 'An error occurred.'), timestamp: new Date() }]);
    } finally { setChatLoading(false); }
  }, [chatInput, localSettings, chatMessages, t, getKnowledgeContext]);

  const applyPreset = useCallback((preset: typeof TRAINING_PRESETS[0]) => {
    updateLocal('system_prompt', isRTL ? preset.prompt_ar : preset.prompt_en);
    toast.success(t(`تم تطبيق "${preset.ar}"`, `Applied "${preset.en}"`));
  }, [isRTL, t, updateLocal]);

  /* ═══════════════════ Render ═══════════════════ */
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const sourceLang = transDir === 'ar2en' ? t('العربية', 'Arabic') : t('الإنجليزية', 'English');
  const targetLang = transDir === 'ar2en' ? t('الإنجليزية', 'English') : t('العربية', 'Arabic');
  const sourceDir = transDir === 'ar2en' ? 'rtl' : 'ltr';
  const targetDir = transDir === 'ar2en' ? 'ltr' : 'rtl';

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-6xl mx-auto" dir={dirClass}>

        {/* ═══ Header ═══ */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-accent to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{t('مركز الذكاء الاصطناعي', 'AI Command Center')}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{t('المحرك المركزي لجميع خدمات الذكاء في المنصة', 'Central engine powering all AI services across the platform')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-[10px] gap-1 rounded-lg h-7 px-2.5">
              <Zap className="w-3 h-3" /><span className="tech-content">{activeModel.label}</span>
            </Badge>
            <Badge variant="secondary" className="text-[10px] gap-1 rounded-lg h-7 px-2.5">
              <activeTone.icon className="w-3 h-3" />{t(activeTone.ar, activeTone.en)}
            </Badge>
            {activeKnowledgeCount > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1 rounded-lg h-7 px-2.5 border-emerald-500/50 text-emerald-600">
                <Database className="w-3 h-3" />{activeKnowledgeCount} {t('مصادر', 'sources')}
              </Badge>
            )}
            {settingsDirty && (
              <Badge variant="outline" className="text-[10px] gap-1 rounded-lg h-7 px-2.5 border-amber-500/50 text-amber-600 animate-pulse">
                <AlertCircle className="w-3 h-3" />{t('تغييرات غير محفوظة', 'Unsaved')}
              </Badge>
            )}
          </div>
        </div>

        {/* ═══ Main Tabs ═══ */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
          <TabsList className="bg-muted/50 rounded-xl h-auto p-1 w-full flex flex-wrap gap-0.5">
            <TabsTrigger value="hub" className="rounded-lg text-xs gap-1.5 data-[state=active]:shadow-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Cog className="w-3.5 h-3.5" />{t('المحرك المركزي', 'Central Engine')}
            </TabsTrigger>
            <TabsTrigger value="translate" className="rounded-lg text-xs gap-1.5 data-[state=active]:shadow-sm">
              <Languages className="w-3.5 h-3.5" />{t('الترجمة', 'Translate')}
            </TabsTrigger>
            <TabsTrigger value="tools" className="rounded-lg text-xs gap-1.5 data-[state=active]:shadow-sm">
              <Wand2 className="w-3.5 h-3.5" />{t('أدوات النصوص', 'Text Tools')}
            </TabsTrigger>
            <TabsTrigger value="blog" className="rounded-lg text-xs gap-1.5 data-[state=active]:shadow-sm">
              <Newspaper className="w-3.5 h-3.5" />{t('المدونة والمحتوى', 'Blog & Content')}
            </TabsTrigger>
            <TabsTrigger value="assistant" className="rounded-lg text-xs gap-1.5 data-[state=active]:shadow-sm">
              <Bot className="w-3.5 h-3.5" />{t('المساعد', 'Assistant')}
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="rounded-lg text-xs gap-1.5 data-[state=active]:shadow-sm">
              <Database className="w-3.5 h-3.5" />{t('المعرفة', 'Knowledge')}
              {activeKnowledgeCount > 0 && <span className="text-[9px] bg-emerald-500/15 text-emerald-600 px-1 rounded-full tech-content">{activeKnowledgeCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg text-xs gap-1.5 data-[state=active]:shadow-sm">
              <Clock className="w-3.5 h-3.5" />{t('السجل', 'History')}
              {history.length > 0 && <span className="text-[9px] bg-primary/15 text-primary px-1 rounded-full tech-content">{history.length}</span>}
            </TabsTrigger>
          </TabsList>

          {/* ═══════ CENTRAL HUB - Global AI Settings ═══════ */}
          <TabsContent value="hub" className="mt-0 space-y-4">
            {/* Services Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Languages, label: t('الترجمة', 'Translation'), desc: t('ترجمة تلقائية بين AR↔EN', 'Auto AR↔EN translation'), color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
                { icon: Wand2, label: t('تحسين المحتوى', 'Content'), desc: t('تحسين وإعادة صياغة', 'Improve & rewrite'), color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
                { icon: Bot, label: t('المساعد الذكي', 'Assistant'), desc: t('محادثة ذكية مع RAG', 'Smart chat with RAG'), color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                { icon: Newspaper, label: t('المدونة', 'Blog Tools'), desc: t('أدوات SEO والمحتوى', 'SEO & content tools'), color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
              ].map((s, i) => (
                <Card key={i} className="rounded-xl border-border/40 hover:border-primary/20 transition-colors cursor-pointer"
                  onClick={() => setActiveTab(i === 0 ? 'translate' : i === 1 ? 'tools' : i === 2 ? 'assistant' : 'blog')}>
                  <CardContent className="p-3 flex items-start gap-2.5">
                    <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                      <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{s.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Global Model & Tone */}
            <Card className="rounded-2xl border-primary/20 bg-card/80 backdrop-blur-sm">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Cog className="w-4 h-4 text-primary" />
                  {t('الإعدادات المركزية — تنطبق على جميع الخدمات', 'Central Settings — Applied to All Services')}
                </CardTitle>
                <p className="text-[10px] text-muted-foreground mt-1">{t('هذه الإعدادات تتحكم في جميع أدوات الذكاء: الترجمة، تحسين المحتوى، المساعد، المدونة، والحقول الذكية في كل الصفحات', 'These settings control all AI tools: translation, content improvement, assistant, blog, and smart fields across all pages')}</p>
              </CardHeader>
              <CardContent className="p-4 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Model Selection */}
                  <div className="space-y-2.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-primary" />{t('النموذج الافتراضي', 'Default Model')}</Label>
                    <div className="space-y-1.5">
                      {MODELS.map(m => (
                        <button key={m.key} onClick={() => updateLocal('default_model', m.key)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-start transition-all border ${localSettings.default_model === m.key ? 'bg-primary/8 border-primary/30 shadow-sm ring-1 ring-primary/10' : 'bg-card border-border/40 hover:border-primary/20'}`}>
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 shrink-0 ${TIER_COLORS[m.tier]}`}>{m.tier}</Badge>
                          <div className="min-w-0">
                            <span className="text-xs font-medium tech-content">{m.label}</span>
                            <span className="text-[10px] text-muted-foreground ms-1.5">{t(m.desc_ar, m.desc_en)}</span>
                          </div>
                          {localSettings.default_model === m.key && <CheckCircle2 className="w-3.5 h-3.5 text-primary ms-auto shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tone Selection */}
                  <div className="space-y-2.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5"><Volume2 className="w-3.5 h-3.5 text-primary" />{t('الأسلوب الافتراضي', 'Default Tone')}</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {TONES.map(tt => (
                        <button key={tt.key} onClick={() => updateLocal('default_tone', tt.key)}
                          className={`flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl text-start transition-all border ${localSettings.default_tone === tt.key ? 'bg-primary/8 border-primary/30 shadow-sm ring-1 ring-primary/10' : 'bg-card border-border/40 hover:border-primary/20'}`}>
                          <div className="flex items-center gap-1.5 w-full">
                            <tt.icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-[11px] font-medium">{t(tt.ar, tt.en)}</span>
                            {localSettings.default_tone === tt.key && <CheckCircle2 className="w-3 h-3 text-primary ms-auto shrink-0" />}
                          </div>
                          <span className="text-[9px] text-muted-foreground">{t(tt.desc_ar, tt.desc_en)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Response Style */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-primary" />{t('أسلوب الرد', 'Response Style')}
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { key: 'concise' as ResponseStyle, ar: 'مختصر', en: 'Concise', desc_ar: 'إجابات قصيرة ومباشرة', desc_en: 'Short and direct' },
                      { key: 'balanced' as ResponseStyle, ar: 'متوازن', en: 'Balanced', desc_ar: 'توازن بين الإيجاز والتفصيل', desc_en: 'Balance of brief and detailed' },
                      { key: 'detailed' as ResponseStyle, ar: 'مفصّل', en: 'Detailed', desc_ar: 'شرح مفصل مع أمثلة', desc_en: 'Detailed with examples' },
                    ]).map(s => (
                      <button key={s.key} onClick={() => updateLocal('response_style', s.key)}
                        className={`flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl text-start transition-all border ${localSettings.response_style === s.key ? 'bg-primary/8 border-primary/30 ring-1 ring-primary/10' : 'bg-card border-border/40 hover:border-primary/20'}`}>
                        <span className="text-[11px] font-medium">{t(s.ar, s.en)}</span>
                        <span className="text-[9px] text-muted-foreground">{t(s.desc_ar, s.desc_en)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Translation Instructions */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5 text-primary" />{t('تعليمات الترجمة المركزية', 'Central Translation Instructions')}
                  </Label>
                  <p className="text-[10px] text-muted-foreground">{t('هذه التعليمات تُطبّق تلقائياً على كل عمليات الترجمة في الموقع (الحقول الذكية، المدونة، إلخ)', 'These instructions are automatically applied to ALL translations across the site (smart fields, blog, etc.)')}</p>
                  <Textarea value={localSettings.translation_instructions}
                    onChange={e => updateLocal('translation_instructions', e.target.value)}
                    placeholder={t('مثال: استخدم المصطلحات التقنية في مجال الألمنيوم بدقة، لا تترجم أسماء العلامات التجارية...', 'Example: Use precise aluminum industry terminology, do not translate brand names...')}
                    className="min-h-[80px] rounded-xl resize-none text-sm" dir="auto" />
                </div>

                {/* Content Improvement Instructions */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />{t('تعليمات تحسين المحتوى المركزية', 'Central Content Improvement Instructions')}
                  </Label>
                  <p className="text-[10px] text-muted-foreground">{t('هذه التعليمات تُطبّق على كل عمليات التحسين والصياغة في جميع الصفحات', 'These instructions are applied to ALL improvement and rewriting operations across all pages')}</p>
                  <Textarea value={localSettings.content_instructions}
                    onChange={e => updateLocal('content_instructions', e.target.value)}
                    placeholder={t('مثال: استخدم لغة مهنية تناسب قطاع المقاولات، تجنب العبارات العامية، ركز على الجودة والموثوقية...', 'Example: Use professional language suitable for construction sector, avoid slang, focus on quality...')}
                    className="min-h-[80px] rounded-xl resize-none text-sm" dir="auto" />
                </div>

                <Separator />

                {/* System Prompt & Training */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-primary" />{t('أمر النظام (System Prompt)', 'System Prompt')}
                  </Label>
                  <p className="text-[10px] text-muted-foreground">{t('يُحدد شخصية المساعد الذكي وأسلوبه في جميع المحادثات', 'Defines the AI assistant personality across all conversations')}</p>
                  <Textarea value={localSettings.system_prompt}
                    onChange={e => updateLocal('system_prompt', e.target.value)}
                    placeholder={t('مثال: أنت مساعد متخصص في مجال الألمنيوم والزجاج والحديد...', 'Example: You are an assistant specialized in aluminum, glass and iron...')}
                    className="min-h-[100px] rounded-xl resize-none text-sm" dir="auto" />
                  {/* Quick presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">{t('قوالب سريعة:', 'Quick presets:')}</span>
                    {TRAINING_PRESETS.map(p => (
                      <Button key={p.key} variant="outline" size="sm" className="h-6 text-[10px] gap-1 rounded-lg" onClick={() => applyPreset(p)}>
                        <p.icon className="w-3 h-3" />{t(p.ar, p.en)}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Knowledge Integration Settings */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-primary" />{t('ربط قاعدة المعرفة', 'Knowledge Base')}
                  </Label>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium">{t('تضمين المعرفة في المحادثات', 'Include knowledge in conversations')}</p>
                      <p className="text-[10px] text-muted-foreground">{t('يستخدم المساعد المصادر النشطة كمرجع', 'Uses active sources as reference')}</p>
                    </div>
                    <Switch checked={localSettings.include_knowledge} onCheckedChange={v => updateLocal('include_knowledge', v)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">{t('الحد الأقصى للمصادر', 'Max sources')}</Label>
                      <Select value={String(localSettings.max_knowledge_entries)} onValueChange={v => updateLocal('max_knowledge_entries', parseInt(v))}>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[3, 5, 8, 10, 15].map(n => (
                            <SelectItem key={n} value={String(n)}>{n} {t('مصادر', 'sources')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">{t('لغة الرد المفضلة', 'Response language')}</Label>
                      <Select value={localSettings.language_preference} onValueChange={v => updateLocal('language_preference', v)}>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">{t('تلقائي', 'Auto')}</SelectItem>
                          <SelectItem value="ar">{t('عربي دائماً', 'Always Arabic')}</SelectItem>
                          <SelectItem value="en">{t('إنجليزي دائماً', 'Always English')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <AlertCircle className="w-3 h-3" />
                    {t('التعديلات تُطبّق فوراً على جميع الخدمات بعد الحفظ', 'Changes apply instantly to all services after saving')}
                  </div>
                  <Button onClick={handleSaveSettings} disabled={settingsLoading || !settingsDirty} className="rounded-xl gap-1.5">
                    {settingsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {t('حفظ الإعدادات المركزية', 'Save Central Settings')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Architecture Diagram */}
            <Card className="rounded-2xl border-border/30 bg-muted/15">
              <CardContent className="p-4">
                <div className="flex items-start gap-2.5">
                  <Award className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-foreground">{t('كيف يعمل المحرك المركزي؟', 'How does the Central Engine work?')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { icon: Languages, ar: 'الترجمة في حقول الإدارة (FieldAI) ← تستخدم النموذج والأسلوب وتعليمات الترجمة من هنا', en: 'Admin field translations (FieldAI) ← Uses model, tone & translation instructions from here' },
                        { icon: Sparkles, ar: 'تحسين المحتوى في كل الصفحات ← يطبّق تعليمات التحسين والأسلوب من هنا', en: 'Content improvement across pages ← Applies improvement instructions & style from here' },
                        { icon: Bot, ar: 'المساعد الذكي ← يعمل بأمر النظام وقاعدة المعرفة المحددة هنا', en: 'Smart Assistant ← Runs with system prompt & knowledge base configured here' },
                        { icon: Newspaper, ar: 'أدوات المدونة ← تستخدم نفس النموذج والأسلوب والإعدادات', en: 'Blog tools ← Uses same model, tone & settings' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-card border border-border/30">
                          <item.icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <p className="text-[10px] text-muted-foreground leading-relaxed">{t(item.ar, item.en)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════ Translation ═══════ */}
          <TabsContent value="translate" className="mt-0">
            <Card className="rounded-2xl border-border/50 overflow-hidden">
              <div className="flex items-center justify-center gap-3 p-3 bg-muted/30 border-b border-border/40">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border/50 min-w-[100px] justify-center">
                  <span className="text-xs font-medium">{transDir === 'ar2en' ? '🇸🇦' : '🇬🇧'}</span>
                  <span className="text-xs">{sourceLang}</span>
                </div>
                <Tooltip><TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 w-8 rounded-full border-primary/30 hover:bg-primary/10" onClick={swapTranslation}>
                    <ArrowLeftRight className="w-4 h-4 text-primary" />
                  </Button>
                </TooltipTrigger><TooltipContent>{t('تبديل', 'Swap')}</TooltipContent></Tooltip>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border/50 min-w-[100px] justify-center">
                  <span className="text-xs font-medium">{transDir === 'ar2en' ? '🇬🇧' : '🇸🇦'}</span>
                  <span className="text-xs">{targetLang}</span>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">{t('النص الأصلي', 'Source Text')}</Label>
                      <StatPill icon={Hash} value={transSource.length} label={t('حرف', 'chars')} />
                    </div>
                    <Textarea value={transSource} onChange={e => setTransSource(e.target.value)}
                      placeholder={transDir === 'ar2en' ? 'أدخل النص بالعربية...' : 'Enter English text...'}
                      className="min-h-[200px] rounded-xl resize-none text-sm leading-relaxed" dir={sourceDir} />
                    <div className="flex items-center justify-between gap-2">
                      <StatPill icon={BarChart3} value={wordCount(transSource)} label={t('كلمة', 'words')} />
                      <div className="flex items-center gap-1.5">
                        {transSource && <Button variant="ghost" size="sm" className="h-7 text-[10px] rounded-lg" onClick={() => setTransSource('')}>
                          <Trash2 className="w-3 h-3 me-1" />{t('مسح', 'Clear')}
                        </Button>}
                        <Button onClick={handleTranslate} disabled={transLoading || !transSource.trim()} size="sm" className="rounded-xl gap-1.5 h-8">
                          {transLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                          {t('ترجم', 'Translate')} <ArrowIcon className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">{t('الترجمة', 'Translation')}</Label>
                      {transResult && <StatPill icon={Hash} value={transResult.length} label={t('حرف', 'chars')} />}
                    </div>
                    <div className="relative">
                      <Textarea value={transResult} onChange={e => setTransResult(e.target.value)}
                        placeholder={t('ستظهر الترجمة هنا...', 'Translation appears here...')}
                        className="min-h-[200px] rounded-xl resize-none text-sm leading-relaxed" dir={targetDir} />
                      {transResult && (
                        <div className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} flex gap-1`}>
                          <Button variant="secondary" size="sm" className="h-7 w-7 rounded-lg" onClick={() => copyText(transResult)}><Copy className="w-3 h-3" /></Button>
                          <Button variant="secondary" size="sm" className="h-7 w-7 rounded-lg" onClick={() => exportText(transResult, 'translation.txt')}><Download className="w-3 h-3" /></Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════ Text Tools ═══════ */}
          <TabsContent value="tools" className="mt-0">
            <Card className="rounded-2xl border-border/50 overflow-hidden">
              <div className="p-3 bg-muted/30 border-b border-border/40">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {QUICK_TOOLS.map(tool => (
                    <Tooltip key={tool.key}><TooltipTrigger asChild>
                      <Button variant={lastToolUsed === tool.key ? 'secondary' : 'outline'} size="sm"
                        className="h-8 text-[11px] gap-1.5 rounded-xl hover:bg-primary/5 hover:border-primary/30"
                        onClick={() => handleTool(tool.key)} disabled={!!toolLoading || !toolInput.trim()}>
                        {toolLoading === tool.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <tool.icon className="w-3.5 h-3.5" />}
                        {t(tool.ar, tool.en)}
                      </Button>
                    </TooltipTrigger><TooltipContent side="bottom" className="text-[10px]">{t(tool.desc_ar, tool.desc_en)}</TooltipContent></Tooltip>
                  ))}
                  <Separator orientation="vertical" className="h-6 mx-0.5" />
                  <Button size="sm" className="h-8 text-[11px] gap-1.5 rounded-xl" onClick={() => handleTool('improve')} disabled={!!toolLoading || !toolInput.trim()}>
                    {toolLoading === 'improve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {t('تحسين شامل', 'Full Improve')}
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">{t('النص المدخل', 'Input Text')}</Label>
                      <div className="flex items-center gap-3">
                        <StatPill icon={BarChart3} value={wordCount(toolInput)} label={t('كلمة', 'words')} />
                        <StatPill icon={Hash} value={toolInput.length} label={t('حرف', 'chars')} />
                      </div>
                    </div>
                    <Textarea value={toolInput} onChange={e => setToolInput(e.target.value)}
                      placeholder={t('ألصق النص هنا...', 'Paste text here...')}
                      className="min-h-[240px] rounded-xl resize-none text-sm leading-relaxed" dir="auto" />
                    {toolInput && <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground" onClick={() => setToolInput('')}>
                      <Trash2 className="w-2.5 h-2.5 me-1" />{t('مسح', 'Clear')}
                    </Button>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">{t('النتيجة', 'Result')}</Label>
                        {lastToolUsed && <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded-md capitalize">
                          {t(QUICK_TOOLS.find(tt => tt.key === lastToolUsed)?.ar || lastToolUsed, QUICK_TOOLS.find(tt => tt.key === lastToolUsed)?.en || lastToolUsed)}
                        </Badge>}
                      </div>
                      {toolResult && <StatPill icon={BarChart3} value={wordCount(toolResult)} label={t('كلمة', 'words')} />}
                    </div>
                    <div className="relative">
                      <Textarea value={toolResult} onChange={e => setToolResult(e.target.value)}
                        placeholder={t('ستظهر النتيجة هنا...', 'Result appears here...')}
                        className="min-h-[240px] rounded-xl resize-none text-sm leading-relaxed" dir="auto" />
                      {toolResult && (
                        <div className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} flex gap-1`}>
                          <Button variant="secondary" size="sm" className="h-7 w-7 rounded-lg" onClick={() => copyText(toolResult)}><Copy className="w-3 h-3" /></Button>
                          <Button variant="secondary" size="sm" className="h-7 w-7 rounded-lg" onClick={() => exportText(toolResult, 'result.txt')}><Download className="w-3 h-3" /></Button>
                          <Button variant="secondary" size="sm" className="h-7 w-7 rounded-lg" onClick={() => { setToolInput(toolResult); setToolResult(''); }}>
                            <RotateCcw className="w-3 h-3" /></Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════ Blog & Content ═══════ */}
          <TabsContent value="blog" className="mt-0 space-y-3">
            <Card className="rounded-2xl border-border/50 overflow-hidden">
              <div className="p-3 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-b border-border/40">
                <div className="flex items-center gap-2 mb-2.5">
                  <Newspaper className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-primary">{t('أدوات المدونة والمحتوى', 'Blog & Content Tools')}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {BLOG_TOOLS.map(tool => (
                    <Tooltip key={tool.key}><TooltipTrigger asChild>
                      <Button variant={lastBlogTool === tool.key ? 'default' : 'outline'} size="sm"
                        className={`h-8 text-[11px] gap-1.5 rounded-xl ${lastBlogTool !== tool.key ? 'hover:bg-primary/5 hover:border-primary/30' : ''}`}
                        onClick={() => handleBlogTool(tool.key)} disabled={!!blogLoading || !blogInput.trim()}>
                        {blogLoading === tool.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <tool.icon className="w-3.5 h-3.5" />}
                        {t(tool.ar, tool.en)}
                      </Button>
                    </TooltipTrigger><TooltipContent side="bottom" className="text-[10px]">{t(tool.desc_ar, tool.desc_en)}</TooltipContent></Tooltip>
                  ))}
                </div>
              </div>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">{t('الموضوع أو المحتوى', 'Topic or Content')}</Label>
                    <Textarea value={blogInput} onChange={e => setBlogInput(e.target.value)}
                      placeholder={t('أدخل موضوع المقال...', 'Enter article topic...')}
                      className="min-h-[240px] rounded-xl resize-none text-sm leading-relaxed" dir="auto" />
                    <div className="flex items-center gap-1.5">
                      {blogInput && <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground" onClick={() => setBlogInput('')}>
                        <Trash2 className="w-2.5 h-2.5 me-1" />{t('مسح', 'Clear')}
                      </Button>}
                      {toolResult && <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground" onClick={() => setBlogInput(toolResult)}>
                        <Link2 className="w-2.5 h-2.5 me-1" />{t('استيراد من أدوات النصوص', 'Import from Text Tools')}
                      </Button>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">{t('النتيجة', 'Result')}</Label>
                        {lastBlogTool && <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded-md">
                          {t(BLOG_TOOLS.find(b => b.key === lastBlogTool)?.ar || '', BLOG_TOOLS.find(b => b.key === lastBlogTool)?.en || '')}
                        </Badge>}
                      </div>
                    </div>
                    <div className="relative">
                      <Textarea value={blogResult} onChange={e => setBlogResult(e.target.value)}
                        placeholder={t('ستظهر النتيجة هنا...', 'Result appears here...')}
                        className="min-h-[240px] rounded-xl resize-none text-sm leading-relaxed" dir="auto" />
                      {blogResult && (
                        <div className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} flex gap-1`}>
                          <Button variant="secondary" size="sm" className="h-7 w-7 rounded-lg" onClick={() => copyText(blogResult)}><Copy className="w-3 h-3" /></Button>
                          <Button variant="secondary" size="sm" className="h-7 w-7 rounded-lg" onClick={() => exportText(blogResult, 'blog-content.txt')}><Download className="w-3 h-3" /></Button>
                        </div>
                      )}
                    </div>
                    {blogResult && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5 rounded-xl" onClick={handleReverseTranslate} disabled={reverseTranslateLoading}>
                          {reverseTranslateLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          {t('ترجمة عكسية', 'Reverse Translate')}
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5 rounded-xl" onClick={() => { setBlogInput(blogResult); setBlogResult(''); }}>
                          <RotateCcw className="w-3 h-3" />{t('استخدم كمدخل', 'Use as input')}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Smart Suggestions */}
            <Card className="rounded-2xl border-border/50">
              <CardHeader className="p-3 border-b border-border/40">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />{t('توصيات ذكية', 'Smart Recommendations')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {SMART_SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => { setChatInput(t(s.ar, s.en)); setActiveTab('assistant'); }}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all text-start group">
                      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 group-hover:bg-primary/10">
                        <s.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <span className="text-[11px] text-muted-foreground group-hover:text-foreground leading-snug">{t(s.ar, s.en)}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════ Smart Assistant ═══════ */}
          <TabsContent value="assistant" className="mt-0">
            <Card className="rounded-2xl border-border/50 overflow-hidden flex flex-col" style={{ height: 520 }}>
              <CardHeader className="p-3 bg-muted/30 border-b border-border/40 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
                    <Bot className="w-4.5 h-4.5 text-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold">{t('المساعد الذكي', 'Smart Assistant')}</h3>
                    <p className="text-[10px] text-muted-foreground">{t('يعمل بإعدادات المحرك المركزي + قاعدة المعرفة', 'Powered by Central Engine settings + Knowledge Base')}</p>
                  </div>
                </div>
              </CardHeader>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                    <Bot className="w-12 h-12 opacity-20" />
                    <p className="text-xs">{t('ابدأ محادثة مع المساعد الذكي', 'Start a conversation')}</p>
                  </div>
                )}
                {chatMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm group ${
                      msg.role === 'user'
                        ? `bg-primary text-primary-foreground ${isRTL ? 'rounded-es-md' : 'rounded-ee-md'}`
                        : `bg-muted/50 border border-border/40 ${isRTL ? 'rounded-ee-md' : 'rounded-es-md'}`
                    }`}>
                      <p className="whitespace-pre-wrap leading-relaxed" dir="auto">{msg.content}</p>
                      <div className={`flex items-center gap-2 mt-1.5 ${msg.role === 'user' ? 'justify-end' : 'justify-between'}`}>
                        <span className={`text-[9px] ${msg.role === 'user' ? 'text-primary-foreground/50' : 'text-muted-foreground/50'}`}>
                          {msg.timestamp.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.role === 'assistant' && (
                          <Button variant="ghost" size="sm" className="h-5 w-5 rounded opacity-0 group-hover:opacity-100" onClick={() => copyText(msg.content)}>
                            <Copy className="w-2.5 h-2.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className={`bg-muted/50 border border-border/40 rounded-2xl ${isRTL ? 'rounded-ee-md' : 'rounded-es-md'} px-4 py-3`}>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-3 border-t border-border/40 bg-muted/20 shrink-0">
                <div className="flex gap-2">
                  <Input value={chatInput} onChange={e => setChatInput(e.target.value)}
                    placeholder={t('اكتب رسالتك...', 'Type your message...')}
                    className="rounded-xl text-sm h-10" dir="auto"
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat(); } }} />
                  <Button onClick={handleChat} disabled={chatLoading || !chatInput.trim()} size="sm" className="rounded-xl h-10 w-10 shrink-0">
                    {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />}
                  </Button>
                </div>
                {chatMessages.length > 0 && (
                  <Button variant="ghost" size="sm" className="mt-1.5 h-6 text-[10px] text-muted-foreground" onClick={() => setChatMessages([])}>
                    <Trash2 className="w-2.5 h-2.5 me-1" />{t('مسح المحادثة', 'Clear chat')}
                  </Button>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* ═══════ Knowledge Base ═══════ */}
          <TabsContent value="knowledge" className="mt-0 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Database, value: knowledgeEntries.length, label: t('إجمالي المصادر', 'Total Sources'), color: 'text-blue-600' },
                { icon: CheckCircle2, value: activeKnowledgeCount, label: t('مصادر نشطة', 'Active'), color: 'text-emerald-600' },
                { icon: Hash, value: totalKnowledgeChars.toLocaleString(), label: t('إجمالي الأحرف', 'Total Chars'), color: 'text-amber-600' },
                { icon: Brain, value: localSettings.include_knowledge ? t('مفعّل', 'ON') : t('معطّل', 'OFF'), label: t('الربط بالمساعد', 'Assistant Link'), color: 'text-purple-600' },
              ].map((s, i) => (
                <Card key={i} className="rounded-xl border-border/40">
                  <CardContent className="p-3 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground tech-content">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="rounded-2xl border-border/50">
              <CardHeader className="p-3 border-b border-border/40 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-primary" />{t('مصادر المعرفة', 'Knowledge Sources')}
                </CardTitle>
                <Button size="sm" className="h-8 text-[11px] gap-1.5 rounded-xl" onClick={() => setShowAddKnowledge(true)}>
                  <Plus className="w-3.5 h-3.5" />{t('إضافة مصدر', 'Add Source')}
                </Button>
              </CardHeader>

              {showAddKnowledge && (
                <div className="p-4 bg-muted/20 border-b border-border/30 space-y-3 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex gap-2">
                    {([
                      { key: 'text' as const, icon: FileText, ar: 'نص مباشر', en: 'Direct Text' },
                      { key: 'file' as const, icon: Upload, ar: 'ملف نصي', en: 'Text File' },
                      { key: 'url' as const, icon: Globe, ar: 'رابط موقع', en: 'Website URL' },
                    ]).map(st => (
                      <button key={st.key} onClick={() => setAddSourceType(st.key)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border transition-all ${addSourceType === st.key ? 'bg-primary/10 border-primary/30 text-primary font-medium' : 'bg-card border-border/40 hover:border-primary/20'}`}>
                        <st.icon className="w-3.5 h-3.5" />{t(st.ar, st.en)}
                      </button>
                    ))}
                  </div>
                  <Input value={addTitle} onChange={e => setAddTitle(e.target.value)} placeholder={t('عنوان المصدر...', 'Source title...')} className="rounded-xl text-sm" dir="auto" />
                  {addSourceType === 'url' ? (
                    <Input value={addUrl} onChange={e => setAddUrl(e.target.value)} placeholder="https://example.com" className="rounded-xl text-sm" dir="ltr" />
                  ) : addSourceType === 'file' ? (
                    <div className="space-y-2">
                      <input ref={fileInputRef} type="file" accept=".txt,.md,.csv,.json,.xml" onChange={handleFileUpload} className="hidden" />
                      <Button variant="outline" className="w-full rounded-xl h-20 border-dashed gap-2 flex-col" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{t('اختر ملف', 'Choose file')}</span>
                      </Button>
                      {addContent && <p className="text-[10px] text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{t(`تم تحميل ${addContent.length} حرف`, `Loaded ${addContent.length} chars`)}</p>}
                    </div>
                  ) : (
                    <Textarea value={addContent} onChange={e => setAddContent(e.target.value)}
                      placeholder={t('ألصق المحتوى هنا...', 'Paste content here...')}
                      className="min-h-[120px] rounded-xl resize-none text-sm" dir="auto" />
                  )}
                  <Input value={addTags} onChange={e => setAddTags(e.target.value)}
                    placeholder={t('وسوم (اختياري): خدمات, أسعار, ...', 'Tags: services, prices, ...')} className="rounded-xl text-sm" dir="auto" />
                  <div className="flex items-center gap-2 justify-end">
                    <Button variant="ghost" size="sm" className="rounded-xl text-[11px]" onClick={() => { setShowAddKnowledge(false); setAddTitle(''); setAddContent(''); setAddUrl(''); setAddTags(''); }}>
                      {t('إلغاء', 'Cancel')}
                    </Button>
                    <Button size="sm" className="rounded-xl text-[11px] gap-1.5" onClick={handleAddKnowledge}
                      disabled={addLoading || !addTitle.trim() || (addSourceType === 'url' ? !addUrl.trim() : !addContent.trim())}>
                      {addLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      {addSourceType === 'url' ? t('استخراج وحفظ', 'Extract & Save') : t('حفظ', 'Save')}
                    </Button>
                  </div>
                </div>
              )}

              <CardContent className="p-0">
                {knowledgeEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                    <GraduationCap className="w-12 h-12 opacity-20" />
                    <p className="text-sm font-medium">{t('لا توجد مصادر معرفة بعد', 'No knowledge sources yet')}</p>
                    <p className="text-[11px] text-muted-foreground/70 max-w-sm text-center">{t('أضف محتوى لتغذية المساعد الذكي', 'Add content to feed the AI assistant')}</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[400px]">
                    <div className="divide-y divide-border/30">
                      {knowledgeEntries.map(entry => (
                        <div key={entry.id} className={`p-3 hover:bg-muted/30 transition-colors ${!entry.is_active ? 'opacity-50' : ''}`}>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
                              {entry.source_type === 'url' ? <Globe className="w-4 h-4 text-blue-500" />
                                : entry.source_type === 'file' ? <FileText className="w-4 h-4 text-amber-500" />
                                : <Type className="w-4 h-4 text-emerald-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <h4 className="text-xs font-medium text-foreground truncate" dir="auto">{entry.title}</h4>
                                <Badge variant="outline" className="text-[8px] px-1 py-0 shrink-0">{entry.source_type}</Badge>
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate" dir="auto">{entry.content.slice(0, 120)}...</p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-[9px] text-muted-foreground/60 tech-content">{entry.char_count.toLocaleString()} {t('حرف', 'chars')}</span>
                                {entry.tags?.length > 0 && entry.tags.map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-[8px] px-1 py-0">{tag}</Badge>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button variant="ghost" size="sm" className="h-7 w-7 rounded-lg" onClick={() => toggleKnowledge(entry.id, !entry.is_active)}>
                                {entry.is_active ? <Eye className="w-3.5 h-3.5 text-emerald-500" /> : <EyeOff className="w-3.5 h-3.5" />}
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 rounded-lg text-destructive hover:text-destructive" onClick={() => deleteKnowledge(entry.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════ History ═══════ */}
          <TabsContent value="history" className="mt-0">
            <Card className="rounded-2xl border-border/50">
              <CardHeader className="p-3 border-b border-border/40 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />{t('سجل العمليات', 'Operations History')}
                  <Badge variant="secondary" className="text-[9px] tech-content">{history.length}</Badge>
                </CardTitle>
                {history.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] text-muted-foreground" onClick={() => setHistory([])}>
                    <Trash2 className="w-3 h-3 me-1" />{t('مسح', 'Clear')}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                    <Clock className="w-10 h-10 opacity-20" />
                    <p className="text-xs">{t('لا توجد عمليات سابقة', 'No previous operations')}</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[400px]">
                    <div className="divide-y divide-border/30">
                      {history.map(h => (
                        <div key={h.id} className="p-3 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded-md capitalize">{h.action}</Badge>
                              <span className="text-[9px] text-muted-foreground tech-content">{h.model.split('/').pop()}</span>
                            </div>
                            <span className="text-[9px] text-muted-foreground/60">
                              {h.timestamp.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate" dir="auto">{h.input}</p>
                          <p className="text-[11px] text-foreground/80 truncate mt-0.5" dir="auto">→ {h.output}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default DashboardAiCenter;
