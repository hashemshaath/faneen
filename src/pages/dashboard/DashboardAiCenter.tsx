import React, { useState, useTransition, useRef, useEffect } from 'react';
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
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Languages, Sparkles, Wand2, Bot, Send, Copy, RotateCcw, ArrowLeftRight,
  Loader2, CheckCircle2, Zap, Brain, MessageSquare, FileText, Type,
  Palette, Settings2, BookOpen, HelpCircle, Lightbulb, PenLine,
  Volume2, Shield, ChevronDown, ChevronUp, Star,
} from 'lucide-react';

/* ═══════════════════ Types ═══════════════════ */
type ToneType = 'formal' | 'casual' | 'marketing' | 'academic' | 'creative' | 'technical';
type AiModel = 'google/gemini-3-flash-preview' | 'google/gemini-2.5-flash' | 'google/gemini-2.5-pro' | 'openai/gpt-5-mini' | 'openai/gpt-5';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/* ═══════════════════ Constants ═══════════════════ */
const TONES: { key: ToneType; ar: string; en: string; icon: React.ElementType; desc_ar: string; desc_en: string }[] = [
  { key: 'formal', ar: 'رسمي', en: 'Formal', icon: Shield, desc_ar: 'مناسب للمراسلات الرسمية والعقود', desc_en: 'Suitable for official communications' },
  { key: 'casual', ar: 'عامي', en: 'Casual', icon: MessageSquare, desc_ar: 'ودي وبسيط للتواصل اليومي', desc_en: 'Friendly and simple for daily use' },
  { key: 'marketing', ar: 'تسويقي', en: 'Marketing', icon: Zap, desc_ar: 'جذاب ومقنع للإعلانات والعروض', desc_en: 'Engaging and persuasive for ads' },
  { key: 'academic', ar: 'أكاديمي', en: 'Academic', icon: BookOpen, desc_ar: 'علمي ودقيق للمحتوى التعليمي', desc_en: 'Scientific and precise' },
  { key: 'creative', ar: 'إبداعي', en: 'Creative', icon: Palette, desc_ar: 'مبتكر ومميز بأسلوب فريد', desc_en: 'Innovative with unique style' },
  { key: 'technical', ar: 'تقني', en: 'Technical', icon: Settings2, desc_ar: 'دقيق وتخصصي للمحتوى التقني', desc_en: 'Precise for technical content' },
];

const MODELS: { key: AiModel; label: string; desc_ar: string; desc_en: string; tier: string }[] = [
  { key: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash', desc_ar: 'سريع ومتوازن - الافتراضي', desc_en: 'Fast & balanced - Default', tier: 'fast' },
  { key: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc_ar: 'اقتصادي وفعال', desc_en: 'Economic & efficient', tier: 'fast' },
  { key: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', desc_ar: 'أعلى جودة - استدلال عميق', desc_en: 'Highest quality - deep reasoning', tier: 'pro' },
  { key: 'openai/gpt-5-mini', label: 'GPT-5 Mini', desc_ar: 'متوازن مع أداء قوي', desc_en: 'Balanced with strong performance', tier: 'mid' },
  { key: 'openai/gpt-5', label: 'GPT-5', desc_ar: 'الأقوى - للمهام المعقدة', desc_en: 'Most powerful - complex tasks', tier: 'pro' },
];

const QUICK_TOOLS = [
  { key: 'summarize', ar: 'تلخيص', en: 'Summarize', icon: FileText },
  { key: 'expand', ar: 'توسيع', en: 'Expand', icon: Type },
  { key: 'proofread', ar: 'تدقيق لغوي', en: 'Proofread', icon: CheckCircle2 },
  { key: 'rewrite', ar: 'إعادة صياغة', en: 'Rewrite', icon: RotateCcw },
  { key: 'bullet_points', ar: 'نقاط رئيسية', en: 'Bullet Points', icon: Lightbulb },
  { key: 'headline', ar: 'عنوان جذاب', en: 'Headline', icon: Star },
];

/* ═══════════════════ AI Call Helper ═══════════════════ */
async function callAiCenter(params: {
  action: string;
  text: string;
  sourceLang?: string;
  targetLang?: string;
  tone?: string;
  model?: AiModel;
  context?: string;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ai-center', { body: params });
  if (error) {
    if (error.message?.includes('429')) toast.error('تم تجاوز الحد، حاول لاحقاً');
    else if (error.message?.includes('402')) toast.error('الرصيد غير كافٍ');
    else toast.error(error.message || 'خطأ في الذكاء الاصطناعي');
    throw error;
  }
  return data?.result || '';
}

/* ═══════════════════ Component ═══════════════════ */
const DashboardAiCenter: React.FC = () => {
  const { isRTL } = useLanguage();
  const [isPending, startTransition] = useTransition();

  // Shared state
  const [selectedModel, setSelectedModel] = useState<AiModel>('google/gemini-3-flash-preview');
  const [selectedTone, setSelectedTone] = useState<ToneType>('formal');

  // Translation tab
  const [transSource, setTransSource] = useState('');
  const [transResult, setTransResult] = useState('');
  const [transDir, setTransDir] = useState<'ar2en' | 'en2ar'>('ar2en');
  const [transLoading, setTransLoading] = useState(false);

  // Text tools tab
  const [toolInput, setToolInput] = useState('');
  const [toolResult, setToolResult] = useState('');
  const [toolLoading, setToolLoading] = useState<string | null>(null);

  // Chat tab
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Settings panel
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  /* ─── Handlers ─── */
  const handleTranslate = async () => {
    if (!transSource.trim()) return;
    setTransLoading(true);
    try {
      const result = await callAiCenter({
        action: 'translate',
        text: transSource,
        sourceLang: transDir === 'ar2en' ? 'ar' : 'en',
        targetLang: transDir === 'ar2en' ? 'en' : 'ar',
        tone: selectedTone,
        model: selectedModel,
      });
      setTransResult(result);
    } catch {} finally { setTransLoading(false); }
  };

  const swapTranslation = () => {
    setTransDir(d => d === 'ar2en' ? 'en2ar' : 'ar2en');
    setTransSource(transResult);
    setTransResult(transSource);
  };

  const handleTool = async (toolKey: string) => {
    if (!toolInput.trim()) return;
    setToolLoading(toolKey);
    try {
      const result = await callAiCenter({
        action: toolKey,
        text: toolInput,
        tone: selectedTone,
        model: selectedModel,
      });
      setToolResult(result);
    } catch {} finally { setToolLoading(null); }
  };

  const handleImprove = async () => {
    if (!toolInput.trim()) return;
    setToolLoading('improve');
    try {
      const result = await callAiCenter({
        action: 'improve',
        text: toolInput,
        tone: selectedTone,
        model: selectedModel,
      });
      setToolResult(result);
    } catch {} finally { setToolLoading(null); }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    try {
      const result = await callAiCenter({
        action: 'chat',
        text: chatInput,
        model: selectedModel,
        context: chatMessages.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n'),
      });
      setChatMessages(prev => [...prev, { role: 'assistant', content: result, timestamp: new Date() }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: isRTL ? 'حدث خطأ، حاول مرة أخرى.' : 'An error occurred, try again.', timestamp: new Date() }]);
    } finally { setChatLoading(false); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(isRTL ? 'تم النسخ' : 'Copied');
  };

  const activeTone = TONES.find(t => t.key === selectedTone)!;
  const activeModel = MODELS.find(m => m.key === selectedModel)!;

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{isRTL ? 'مركز الذكاء الاصطناعي' : 'AI Center'}</h1>
              <p className="text-xs text-muted-foreground">{isRTL ? 'أدوات ذكية للترجمة وتحسين النصوص والمساعد الذكي' : 'Smart tools for translation, text improvement & AI assistant'}</p>
            </div>
          </div>

          {/* Model & Tone selectors */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-xl" onClick={() => setShowSettings(!showSettings)}>
              <Settings2 className="w-3.5 h-3.5" />
              {isRTL ? 'الإعدادات' : 'Settings'}
              {showSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <Card className="border-primary/20 bg-primary/[0.02] rounded-2xl animate-in slide-in-from-top-2 duration-200">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Model Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    {isRTL ? 'النموذج' : 'Model'}
                  </Label>
                  <Select value={selectedModel} onValueChange={v => setSelectedModel(v as AiModel)}>
                    <SelectTrigger className="h-9 rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODELS.map(m => (
                        <SelectItem key={m.key} value={m.key}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${m.tier === 'pro' ? 'border-amber-500 text-amber-600' : m.tier === 'mid' ? 'border-blue-500 text-blue-600' : 'border-emerald-500 text-emerald-600'}`}>
                              {m.tier}
                            </Badge>
                            <span className="text-xs">{m.label}</span>
                            <span className="text-[10px] text-muted-foreground">– {isRTL ? m.desc_ar : m.desc_en}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tone Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-primary" />
                    {isRTL ? 'اللهجة / الأسلوب' : 'Tone / Style'}
                  </Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {TONES.map(t => (
                      <button
                        key={t.key}
                        onClick={() => setSelectedTone(t.key)}
                        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-medium transition-all border ${
                          selectedTone === t.key
                            ? 'bg-primary/10 border-primary/30 text-primary shadow-sm'
                            : 'bg-card border-border/50 text-muted-foreground hover:border-primary/20'
                        }`}
                      >
                        <t.icon className="w-3.5 h-3.5" />
                        {isRTL ? t.ar : t.en}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active config summary */}
              <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Zap className="w-2.5 h-2.5" />{activeModel.label}
                </Badge>
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <activeTone.icon className="w-2.5 h-2.5" />{isRTL ? activeTone.ar : activeTone.en}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="translate" className="space-y-3">
          <TabsList className="bg-muted/50 rounded-xl h-10 p-1">
            <TabsTrigger value="translate" className="rounded-lg text-xs gap-1.5 data-[state=active]:shadow-sm">
              <Languages className="w-3.5 h-3.5" />{isRTL ? 'الترجمة' : 'Translate'}
            </TabsTrigger>
            <TabsTrigger value="tools" className="rounded-lg text-xs gap-1.5 data-[state=active]:shadow-sm">
              <Wand2 className="w-3.5 h-3.5" />{isRTL ? 'أدوات النصوص' : 'Text Tools'}
            </TabsTrigger>
            <TabsTrigger value="assistant" className="rounded-lg text-xs gap-1.5 data-[state=active]:shadow-sm">
              <Bot className="w-3.5 h-3.5" />{isRTL ? 'المساعد الذكي' : 'Assistant'}
            </TabsTrigger>
          </TabsList>

          {/* ═══════ Translation Tab ═══════ */}
          <TabsContent value="translate" className="mt-0 space-y-3">
            <Card className="rounded-2xl border-border/50">
              <CardContent className="p-4">
                {/* Direction Bar */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Badge variant="outline" className="text-xs px-3 py-1 rounded-lg">
                    {transDir === 'ar2en' ? '🇸🇦 العربية' : '🇬🇧 English'}
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full" onClick={swapTranslation}>
                    <ArrowLeftRight className="w-4 h-4" />
                  </Button>
                  <Badge variant="outline" className="text-xs px-3 py-1 rounded-lg">
                    {transDir === 'ar2en' ? '🇬🇧 English' : '🇸🇦 العربية'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Source */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">{isRTL ? 'النص الأصلي' : 'Source Text'}</Label>
                    <Textarea
                      value={transSource}
                      onChange={e => setTransSource(e.target.value)}
                      placeholder={transDir === 'ar2en' ? 'أدخل النص بالعربية...' : 'Enter English text...'}
                      className="min-h-[180px] rounded-xl resize-none text-sm"
                      dir={transDir === 'ar2en' ? 'rtl' : 'ltr'}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">{transSource.length} {isRTL ? 'حرف' : 'chars'}</span>
                      <Button onClick={handleTranslate} disabled={transLoading || !transSource.trim()} size="sm" className="rounded-xl gap-1.5">
                        {transLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                        {isRTL ? 'ترجم' : 'Translate'}
                      </Button>
                    </div>
                  </div>

                  {/* Result */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">{isRTL ? 'الترجمة' : 'Translation'}</Label>
                    <div className="relative">
                      <Textarea
                        value={transResult}
                        onChange={e => setTransResult(e.target.value)}
                        placeholder={isRTL ? 'ستظهر الترجمة هنا...' : 'Translation will appear here...'}
                        className="min-h-[180px] rounded-xl resize-none text-sm"
                        dir={transDir === 'ar2en' ? 'ltr' : 'rtl'}
                      />
                      {transResult && (
                        <Button variant="ghost" size="sm" className="absolute top-2 end-2 h-7 w-7 rounded-lg" onClick={() => copyToClipboard(transResult)}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{transResult.length} {isRTL ? 'حرف' : 'chars'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════ Text Tools Tab ═══════ */}
          <TabsContent value="tools" className="mt-0 space-y-3">
            <Card className="rounded-2xl border-border/50">
              <CardContent className="p-4 space-y-4">
                {/* Quick Tools Bar */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">{isRTL ? 'أدوات سريعة' : 'Quick Tools'}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_TOOLS.map(tool => (
                      <Button
                        key={tool.key}
                        variant="outline"
                        size="sm"
                        className="h-8 text-[11px] gap-1.5 rounded-xl hover:bg-primary/5 hover:border-primary/30"
                        onClick={() => handleTool(tool.key)}
                        disabled={!!toolLoading || !toolInput.trim()}
                      >
                        {toolLoading === tool.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <tool.icon className="w-3.5 h-3.5" />}
                        {isRTL ? tool.ar : tool.en}
                      </Button>
                    ))}
                    <Separator orientation="vertical" className="h-8 mx-1" />
                    <Button
                      variant="default"
                      size="sm"
                      className="h-8 text-[11px] gap-1.5 rounded-xl"
                      onClick={handleImprove}
                      disabled={!!toolLoading || !toolInput.trim()}
                    >
                      {toolLoading === 'improve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {isRTL ? 'تحسين شامل' : 'Full Improve'}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Input */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">{isRTL ? 'النص المدخل' : 'Input Text'}</Label>
                    <Textarea
                      value={toolInput}
                      onChange={e => setToolInput(e.target.value)}
                      placeholder={isRTL ? 'ألصق النص هنا لمعالجته...' : 'Paste text here to process...'}
                      className="min-h-[220px] rounded-xl resize-none text-sm"
                    />
                    <span className="text-[10px] text-muted-foreground">{toolInput.split(/\s+/).filter(Boolean).length} {isRTL ? 'كلمة' : 'words'} · {toolInput.length} {isRTL ? 'حرف' : 'chars'}</span>
                  </div>

                  {/* Output */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">{isRTL ? 'النتيجة' : 'Result'}</Label>
                    <div className="relative">
                      <Textarea
                        value={toolResult}
                        onChange={e => setToolResult(e.target.value)}
                        placeholder={isRTL ? 'ستظهر النتيجة هنا...' : 'Result will appear here...'}
                        className="min-h-[220px] rounded-xl resize-none text-sm"
                      />
                      {toolResult && (
                        <div className="absolute top-2 end-2 flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 rounded-lg" onClick={() => copyToClipboard(toolResult)}>
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 rounded-lg" onClick={() => { setToolInput(toolResult); setToolResult(''); }}>
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{toolResult.split(/\s+/).filter(Boolean).length} {isRTL ? 'كلمة' : 'words'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════ Smart Assistant Tab ═══════ */}
          <TabsContent value="assistant" className="mt-0 space-y-3">
            <Card className="rounded-2xl border-border/50 overflow-hidden">
              <CardHeader className="p-3 bg-muted/30 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{isRTL ? 'المساعد الذكي' : 'Smart Assistant'}</CardTitle>
                    <p className="text-[10px] text-muted-foreground">{isRTL ? 'اسأل أي شيء عن أعمالك ومنشآتك' : 'Ask anything about your business'}</p>
                  </div>
                  <Badge variant="secondary" className="ms-auto text-[9px] gap-1">
                    <Zap className="w-2.5 h-2.5" />{activeModel.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Messages */}
                <ScrollArea className="h-[380px] p-4" ref={chatScrollRef}>
                  {chatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
                      <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                        <Brain className="w-7 h-7 text-muted-foreground/40" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">{isRTL ? 'مرحباً! كيف يمكنني مساعدتك؟' : 'Hello! How can I help you?'}</p>
                        <p className="text-[11px] text-muted-foreground/60 mt-1 max-w-sm">{isRTL ? 'يمكنك طرح أي سؤال حول إدارة أعمالك، كتابة المحتوى، أو تحسين نصوصك' : 'Ask about business management, content writing, or text improvement'}</p>
                      </div>
                      {/* Suggestion chips */}
                      <div className="flex flex-wrap gap-1.5 justify-center mt-2 max-w-md">
                        {[
                          isRTL ? 'اكتب وصفاً لمنشأتي' : 'Write a business description',
                          isRTL ? 'اقترح محتوى تسويقي' : 'Suggest marketing content',
                          isRTL ? 'كيف أحسن ملفي الشخصي' : 'How to improve my profile',
                        ].map(s => (
                          <button
                            key={s}
                            onClick={() => { setChatInput(s); }}
                            className="px-3 py-1.5 rounded-xl bg-muted/50 border border-border/50 text-[11px] text-muted-foreground hover:bg-primary/5 hover:border-primary/30 transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-ee-md'
                            : 'bg-muted/50 text-foreground border border-border/50 rounded-es-md'
                        }`}>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          <p className={`text-[9px] mt-1 ${msg.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}>
                            {msg.timestamp.toLocaleTimeString(isRTL ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted/50 border border-border/50 rounded-2xl rounded-es-md px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-3 border-t border-border/50 bg-muted/20">
                  <div className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder={isRTL ? 'اكتب رسالتك...' : 'Type your message...'}
                      className="rounded-xl text-sm h-10"
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat(); } }}
                    />
                    <Button onClick={handleChat} disabled={chatLoading || !chatInput.trim()} size="sm" className="rounded-xl h-10 w-10 shrink-0">
                      {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                  {chatMessages.length > 0 && (
                    <Button variant="ghost" size="sm" className="mt-1.5 h-6 text-[10px] text-muted-foreground" onClick={() => setChatMessages([])}>
                      <RotateCcw className="w-2.5 h-2.5 me-1" />{isRTL ? 'مسح المحادثة' : 'Clear chat'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Help Section */}
        <Card className="rounded-2xl border-border/30 bg-muted/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-muted-foreground/60 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">{isRTL ? 'نصائح للاستخدام الأمثل' : 'Tips for best results'}</p>
                <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc list-inside">
                  <li>{isRTL ? 'اختر النموذج المناسب: استخدم Flash للمهام السريعة و Pro للمهام المعقدة' : 'Choose the right model: Flash for quick tasks, Pro for complex ones'}</li>
                  <li>{isRTL ? 'حدد اللهجة المناسبة قبل البدء للحصول على نتائج دقيقة' : 'Set the tone before starting for accurate results'}</li>
                  <li>{isRTL ? 'يمكنك تعديل النتيجة يدوياً ثم إعادة تحسينها' : 'You can edit the result manually then re-improve it'}</li>
                  <li>{isRTL ? 'في المساعد الذكي، كن محدداً في أسئلتك للحصول على إجابات أفضل' : 'In the assistant, be specific for better answers'}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardAiCenter;
