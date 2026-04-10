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
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Languages, Sparkles, Wand2, Bot, Send, Copy, RotateCcw, ArrowLeftRight,
  Loader2, CheckCircle2, Zap, Brain, MessageSquare, FileText, Type,
  Palette, Settings2, BookOpen, HelpCircle, Lightbulb,
  Volume2, Shield, ChevronDown, ChevronUp, Star, Download, Trash2,
  Clock, Hash, BarChart3, ArrowRight, ArrowLeft,
} from 'lucide-react';

/* ═══════════════════ Types ═══════════════════ */
type ToneType = 'formal' | 'casual' | 'marketing' | 'academic' | 'creative' | 'technical';
type AiModel = 'google/gemini-3-flash-preview' | 'google/gemini-2.5-flash' | 'google/gemini-2.5-pro' | 'openai/gpt-5-mini' | 'openai/gpt-5';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface HistoryEntry {
  id: string;
  action: string;
  input: string;
  output: string;
  timestamp: Date;
  model: string;
  tone: string;
}

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
  { key: 'summarize', ar: 'تلخيص', en: 'Summarize', icon: FileText, desc_ar: 'اختصر النص مع الحفاظ على المعنى', desc_en: 'Condense while keeping meaning' },
  { key: 'expand', ar: 'توسيع', en: 'Expand', icon: Type, desc_ar: 'أضف تفاصيل وأمثلة', desc_en: 'Add details and examples' },
  { key: 'proofread', ar: 'تدقيق لغوي', en: 'Proofread', icon: CheckCircle2, desc_ar: 'صحح الأخطاء الإملائية والنحوية', desc_en: 'Fix grammar and spelling' },
  { key: 'rewrite', ar: 'إعادة صياغة', en: 'Rewrite', icon: RotateCcw, desc_ar: 'أعد كتابة النص بأسلوب مختلف', desc_en: 'Rewrite in different style' },
  { key: 'bullet_points', ar: 'نقاط رئيسية', en: 'Bullet Points', icon: Lightbulb, desc_ar: 'استخرج النقاط الرئيسية', desc_en: 'Extract key points' },
  { key: 'headline', ar: 'عناوين جذابة', en: 'Headlines', icon: Star, desc_ar: 'ولّد عناوين مقنعة', desc_en: 'Generate compelling titles' },
];

const TIER_COLORS: Record<string, string> = {
  fast: 'border-emerald-500/50 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
  mid: 'border-blue-500/50 text-blue-600 bg-blue-50 dark:bg-blue-950/30',
  pro: 'border-amber-500/50 text-amber-600 bg-amber-50 dark:bg-amber-950/30',
};

/* ═══════════════════ Helpers ═══════════════════ */
const uid = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2);

const wordCount = (t: string) => t.split(/\s+/).filter(Boolean).length;

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
    const msg = error.message || '';
    if (msg.includes('429')) toast.error('تم تجاوز الحد، حاول لاحقاً');
    else if (msg.includes('402')) toast.error('الرصيد غير كافٍ');
    else toast.error(msg || 'AI Error');
    throw error;
  }
  return data?.result || '';
}

/* ═══════════════════ Sub-components ═══════════════════ */
const StatPill: React.FC<{ icon: React.ElementType; value: string | number; label: string }> = ({ icon: Icon, value, label }) => (
  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
    <Icon className="w-3 h-3" />
    <span className="font-medium tabular-nums tech-content">{value}</span>
    <span>{label}</span>
  </div>
);

/* ═══════════════════ Main Component ═══════════════════ */
const DashboardAiCenter: React.FC = () => {
  const { isRTL } = useLanguage();
  const t = useCallback((ar: string, en: string) => isRTL ? ar : en, [isRTL]);
  const dirClass = isRTL ? 'rtl' : 'ltr';

  // Shared
  const [selectedModel, setSelectedModel] = useState<AiModel>('google/gemini-3-flash-preview');
  const [selectedTone, setSelectedTone] = useState<ToneType>('formal');
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState('translate');

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

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Memos
  const activeTone = useMemo(() => TONES.find(tt => tt.key === selectedTone)!, [selectedTone]);
  const activeModel = useMemo(() => MODELS.find(m => m.key === selectedModel)!, [selectedModel]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const addHistory = useCallback((action: string, input: string, output: string) => {
    setHistory(prev => [{
      id: uid(), action, input: input.slice(0, 100), output: output.slice(0, 100),
      timestamp: new Date(), model: selectedModel, tone: selectedTone,
    }, ...prev].slice(0, 50));
  }, [selectedModel, selectedTone]);

  const copyText = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('تم النسخ', 'Copied'));
  }, [t]);

  const exportText = useCallback((text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(t('تم التصدير', 'Exported'));
  }, [t]);

  /* ─── Translation ─── */
  const handleTranslate = useCallback(async () => {
    if (!transSource.trim()) return;
    setTransLoading(true);
    try {
      const result = await callAiCenter({
        action: 'translate', text: transSource,
        sourceLang: transDir === 'ar2en' ? 'ar' : 'en',
        targetLang: transDir === 'ar2en' ? 'en' : 'ar',
        tone: selectedTone, model: selectedModel,
      });
      setTransResult(result);
      addHistory('translate', transSource, result);
    } catch {} finally { setTransLoading(false); }
  }, [transSource, transDir, selectedTone, selectedModel, addHistory]);

  const swapTranslation = useCallback(() => {
    setTransDir(d => d === 'ar2en' ? 'en2ar' : 'ar2en');
    setTransSource(transResult);
    setTransResult(transSource);
  }, [transSource, transResult]);

  /* ─── Tools ─── */
  const handleTool = useCallback(async (toolKey: string) => {
    if (!toolInput.trim()) return;
    setToolLoading(toolKey);
    setLastToolUsed(toolKey);
    try {
      const action = toolKey === 'improve' ? 'improve' : toolKey;
      const result = await callAiCenter({
        action, text: toolInput, tone: selectedTone, model: selectedModel,
      });
      setToolResult(result);
      addHistory(toolKey, toolInput, result);
    } catch {} finally { setToolLoading(null); }
  }, [toolInput, selectedTone, selectedModel, addHistory]);

  /* ─── Chat ─── */
  const handleChat = useCallback(async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { id: uid(), role: 'user', content: chatInput, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    try {
      const result = await callAiCenter({
        action: 'chat', text: chatInput, model: selectedModel,
        context: chatMessages.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n'),
      });
      setChatMessages(prev => [...prev, { id: uid(), role: 'assistant', content: result, timestamp: new Date() }]);
    } catch {
      setChatMessages(prev => [...prev, { id: uid(), role: 'assistant', content: t('حدث خطأ، حاول مرة أخرى.', 'An error occurred.'), timestamp: new Date() }]);
    } finally { setChatLoading(false); }
  }, [chatInput, selectedModel, chatMessages, t]);

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
              <h1 className="text-xl font-bold text-foreground">{t('مركز الذكاء الاصطناعي', 'AI Center')}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{t('أدوات ذكية للترجمة وتحسين النصوص والمساعد الذكي', 'Smart tools for translation, text improvement & AI assistant')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Current config badges */}
            <Badge variant="secondary" className="text-[10px] gap-1 rounded-lg h-7 px-2.5">
              <Zap className="w-3 h-3" />
              <span className="tech-content">{activeModel.label}</span>
            </Badge>
            <Badge variant="secondary" className="text-[10px] gap-1 rounded-lg h-7 px-2.5">
              <activeTone.icon className="w-3 h-3" />
              {t(activeTone.ar, activeTone.en)}
            </Badge>
            <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 rounded-lg" onClick={() => setShowSettings(s => !s)}>
              <Settings2 className="w-3.5 h-3.5" />
              {t('ضبط', 'Config')}
              {showSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        {/* ═══ Settings Panel ═══ */}
        {showSettings && (
          <Card className="border-primary/20 bg-card/80 backdrop-blur-sm rounded-2xl animate-in slide-in-from-top-2 duration-200">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Model */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    {t('النموذج', 'Model')}
                  </Label>
                  <div className="space-y-1.5">
                    {MODELS.map(m => (
                      <button
                        key={m.key}
                        onClick={() => setSelectedModel(m.key)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-start transition-all border ${
                          selectedModel === m.key
                            ? 'bg-primary/8 border-primary/30 shadow-sm ring-1 ring-primary/10'
                            : 'bg-card border-border/40 hover:border-primary/20'
                        }`}
                      >
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 shrink-0 ${TIER_COLORS[m.tier]}`}>
                          {m.tier}
                        </Badge>
                        <div className="min-w-0">
                          <span className="text-xs font-medium tech-content">{m.label}</span>
                          <span className="text-[10px] text-muted-foreground ms-1.5">{t(m.desc_ar, m.desc_en)}</span>
                        </div>
                        {selectedModel === m.key && <CheckCircle2 className="w-3.5 h-3.5 text-primary ms-auto shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tone */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-primary" />
                    {t('اللهجة / الأسلوب', 'Tone / Style')}
                  </Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {TONES.map(tt => (
                      <button
                        key={tt.key}
                        onClick={() => setSelectedTone(tt.key)}
                        className={`flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl text-start transition-all border ${
                          selectedTone === tt.key
                            ? 'bg-primary/8 border-primary/30 shadow-sm ring-1 ring-primary/10'
                            : 'bg-card border-border/40 hover:border-primary/20'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 w-full">
                          <tt.icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[11px] font-medium">{t(tt.ar, tt.en)}</span>
                          {selectedTone === tt.key && <CheckCircle2 className="w-3 h-3 text-primary ms-auto shrink-0" />}
                        </div>
                        <span className="text-[9px] text-muted-foreground">{t(tt.desc_ar, tt.desc_en)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Main Tabs ═══ */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
          <TabsList className="bg-muted/50 rounded-xl h-10 p-1 w-full sm:w-auto">
            <TabsTrigger value="translate" className="rounded-lg text-xs gap-1.5 data-[state=active]:shadow-sm flex-1 sm:flex-none">
              <Languages className="w-3.5 h-3.5" />{t('الترجمة', 'Translate')}
            </TabsTrigger>
            <TabsTrigger value="tools" className="rounded-lg text-xs gap-1.5 data-[state=active]:shadow-sm flex-1 sm:flex-none">
              <Wand2 className="w-3.5 h-3.5" />{t('أدوات النصوص', 'Text Tools')}
            </TabsTrigger>
            <TabsTrigger value="assistant" className="rounded-lg text-xs gap-1.5 data-[state=active]:shadow-sm flex-1 sm:flex-none">
              <Bot className="w-3.5 h-3.5" />{t('المساعد', 'Assistant')}
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg text-xs gap-1.5 data-[state=active]:shadow-sm flex-1 sm:flex-none">
              <Clock className="w-3.5 h-3.5" />{t('السجل', 'History')}
              {history.length > 0 && (
                <span className="text-[9px] bg-primary/15 text-primary px-1 rounded-full tech-content">{history.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ═══════ Translation ═══════ */}
          <TabsContent value="translate" className="mt-0">
            <Card className="rounded-2xl border-border/50 overflow-hidden">
              {/* Direction Bar */}
              <div className="flex items-center justify-center gap-3 p-3 bg-muted/30 border-b border-border/40">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border/50 min-w-[100px] justify-center">
                  <span className="text-xs font-medium">{transDir === 'ar2en' ? '🇸🇦' : '🇬🇧'}</span>
                  <span className="text-xs">{sourceLang}</span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 w-8 rounded-full border-primary/30 hover:bg-primary/10" onClick={swapTranslation}>
                      <ArrowLeftRight className="w-4 h-4 text-primary" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('تبديل الاتجاه', 'Swap direction')}</TooltipContent>
                </Tooltip>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border/50 min-w-[100px] justify-center">
                  <span className="text-xs font-medium">{transDir === 'ar2en' ? '🇬🇧' : '🇸🇦'}</span>
                  <span className="text-xs">{targetLang}</span>
                </div>
              </div>

              <CardContent className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Source */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">{t('النص الأصلي', 'Source Text')}</Label>
                      <StatPill icon={Hash} value={transSource.length} label={t('حرف', 'chars')} />
                    </div>
                    <Textarea
                      value={transSource}
                      onChange={e => setTransSource(e.target.value)}
                      placeholder={transDir === 'ar2en' ? 'أدخل النص بالعربية...' : 'Enter English text...'}
                      className="min-h-[200px] rounded-xl resize-none text-sm leading-relaxed"
                      dir={sourceDir}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StatPill icon={BarChart3} value={wordCount(transSource)} label={t('كلمة', 'words')} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {transSource && (
                          <Button variant="ghost" size="sm" className="h-7 text-[10px] rounded-lg" onClick={() => setTransSource('')}>
                            <Trash2 className="w-3 h-3 me-1" />{t('مسح', 'Clear')}
                          </Button>
                        )}
                        <Button onClick={handleTranslate} disabled={transLoading || !transSource.trim()} size="sm" className="rounded-xl gap-1.5 h-8">
                          {transLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                          {t('ترجم', 'Translate')}
                          <ArrowIcon className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Result */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">{t('الترجمة', 'Translation')}</Label>
                      {transResult && <StatPill icon={Hash} value={transResult.length} label={t('حرف', 'chars')} />}
                    </div>
                    <div className="relative">
                      <Textarea
                        value={transResult}
                        onChange={e => setTransResult(e.target.value)}
                        placeholder={t('ستظهر الترجمة هنا...', 'Translation will appear here...')}
                        className="min-h-[200px] rounded-xl resize-none text-sm leading-relaxed"
                        dir={targetDir}
                      />
                      {transResult && (
                        <div className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} flex gap-1`}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="secondary" size="sm" className="h-7 w-7 rounded-lg" onClick={() => copyText(transResult)}>
                                <Copy className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('نسخ', 'Copy')}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="secondary" size="sm" className="h-7 w-7 rounded-lg" onClick={() => exportText(transResult, 'translation.txt')}>
                                <Download className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('تصدير', 'Export')}</TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                    <StatPill icon={BarChart3} value={wordCount(transResult)} label={t('كلمة', 'words')} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════ Text Tools ═══════ */}
          <TabsContent value="tools" className="mt-0">
            <Card className="rounded-2xl border-border/50 overflow-hidden">
              {/* Tools Bar */}
              <div className="p-3 bg-muted/30 border-b border-border/40">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {QUICK_TOOLS.map(tool => (
                    <Tooltip key={tool.key}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={lastToolUsed === tool.key ? 'secondary' : 'outline'}
                          size="sm"
                          className="h-8 text-[11px] gap-1.5 rounded-xl hover:bg-primary/5 hover:border-primary/30"
                          onClick={() => handleTool(tool.key)}
                          disabled={!!toolLoading || !toolInput.trim()}
                        >
                          {toolLoading === tool.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <tool.icon className="w-3.5 h-3.5" />}
                          {t(tool.ar, tool.en)}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[10px]">{t(tool.desc_ar, tool.desc_en)}</TooltipContent>
                    </Tooltip>
                  ))}
                  <Separator orientation="vertical" className="h-6 mx-0.5" />
                  <Button
                    size="sm"
                    className="h-8 text-[11px] gap-1.5 rounded-xl"
                    onClick={() => handleTool('improve')}
                    disabled={!!toolLoading || !toolInput.trim()}
                  >
                    {toolLoading === 'improve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {t('تحسين شامل', 'Full Improve')}
                  </Button>
                </div>
              </div>

              <CardContent className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">{t('النص المدخل', 'Input Text')}</Label>
                      <div className="flex items-center gap-3">
                        <StatPill icon={BarChart3} value={wordCount(toolInput)} label={t('كلمة', 'words')} />
                        <StatPill icon={Hash} value={toolInput.length} label={t('حرف', 'chars')} />
                      </div>
                    </div>
                    <Textarea
                      value={toolInput}
                      onChange={e => setToolInput(e.target.value)}
                      placeholder={t('ألصق النص هنا لمعالجته...', 'Paste text here to process...')}
                      className="min-h-[240px] rounded-xl resize-none text-sm leading-relaxed"
                      dir="auto"
                    />
                    {toolInput && (
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground" onClick={() => setToolInput('')}>
                        <Trash2 className="w-2.5 h-2.5 me-1" />{t('مسح', 'Clear')}
                      </Button>
                    )}
                  </div>

                  {/* Output */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">{t('النتيجة', 'Result')}</Label>
                        {lastToolUsed && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded-md">
                            {t(QUICK_TOOLS.find(tt => tt.key === lastToolUsed)?.ar || lastToolUsed, QUICK_TOOLS.find(tt => tt.key === lastToolUsed)?.en || lastToolUsed)}
                          </Badge>
                        )}
                      </div>
                      {toolResult && <StatPill icon={BarChart3} value={wordCount(toolResult)} label={t('كلمة', 'words')} />}
                    </div>
                    <div className="relative">
                      <Textarea
                        value={toolResult}
                        onChange={e => setToolResult(e.target.value)}
                        placeholder={t('ستظهر النتيجة هنا...', 'Result will appear here...')}
                        className="min-h-[240px] rounded-xl resize-none text-sm leading-relaxed"
                        dir="auto"
                      />
                      {toolResult && (
                        <div className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} flex gap-1`}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="secondary" size="sm" className="h-7 w-7 rounded-lg" onClick={() => copyText(toolResult)}>
                                <Copy className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('نسخ', 'Copy')}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="secondary" size="sm" className="h-7 w-7 rounded-lg" onClick={() => exportText(toolResult, 'result.txt')}>
                                <Download className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('تصدير', 'Export')}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="secondary" size="sm" className="h-7 w-7 rounded-lg" onClick={() => { setToolInput(toolResult); setToolResult(''); }}>
                                <RotateCcw className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('استخدم كمدخل', 'Use as input')}</TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════ Smart Assistant ═══════ */}
          <TabsContent value="assistant" className="mt-0">
            <Card className="rounded-2xl border-border/50 overflow-hidden flex flex-col" style={{ height: 520 }}>
              {/* Header */}
              <CardHeader className="p-3 bg-muted/30 border-b border-border/40 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
                    <Bot className="w-4.5 h-4.5 text-primary-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm">{t('المساعد الذكي', 'Smart Assistant')}</CardTitle>
                    <p className="text-[10px] text-muted-foreground">{t('اسأل أي شيء عن أعمالك ومحتواك', 'Ask anything about your business & content')}</p>
                  </div>
                  <Badge variant="secondary" className="text-[9px] gap-1 shrink-0">
                    <Zap className="w-2.5 h-2.5" />
                    <span className="tech-content">{activeModel.label}</span>
                  </Badge>
                </div>
              </CardHeader>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                      <Brain className="w-8 h-8 text-primary/40" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{t('مرحباً! كيف يمكنني مساعدتك؟', 'Hello! How can I help?')}</p>
                      <p className="text-[11px] text-muted-foreground/70 max-w-sm">{t('يمكنك طرح أسئلة حول إدارة أعمالك أو كتابة المحتوى', 'Ask about business management or content writing')}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-center max-w-md">
                      {[
                        { ar: 'اكتب وصفاً لمنشأتي', en: 'Write a business description' },
                        { ar: 'اقترح محتوى تسويقي', en: 'Suggest marketing content' },
                        { ar: 'ساعدني بكتابة عرض', en: 'Help me write a proposal' },
                        { ar: 'كيف أحسن ملفي الشخصي', en: 'How to improve my profile' },
                      ].map(s => (
                        <button
                          key={s.en}
                          onClick={() => setChatInput(t(s.ar, s.en))}
                          className="px-3 py-1.5 rounded-xl bg-card border border-border/50 text-[11px] text-muted-foreground hover:bg-primary/5 hover:border-primary/30 transition-colors"
                        >
                          {t(s.ar, s.en)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {chatMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`group relative max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      msg.role === 'user'
                        ? `bg-primary text-primary-foreground ${isRTL ? 'rounded-es-md' : 'rounded-ee-md'}`
                        : `bg-muted/50 text-foreground border border-border/40 ${isRTL ? 'rounded-ee-md' : 'rounded-es-md'}`
                    }`}>
                      <p className="whitespace-pre-wrap leading-relaxed" dir="auto">{msg.content}</p>
                      <div className={`flex items-center gap-2 mt-1.5 ${msg.role === 'user' ? 'justify-end' : 'justify-between'}`}>
                        <span className={`text-[9px] ${msg.role === 'user' ? 'text-primary-foreground/50' : 'text-muted-foreground/50'}`}>
                          {msg.timestamp.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.role === 'assistant' && (
                          <Button
                            variant="ghost" size="sm"
                            className="h-5 w-5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyText(msg.content)}
                          >
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

              {/* Input */}
              <div className="p-3 border-t border-border/40 bg-muted/20 shrink-0">
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder={t('اكتب رسالتك...', 'Type your message...')}
                    className="rounded-xl text-sm h-10"
                    dir="auto"
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat(); } }}
                  />
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

          {/* ═══════ History ═══════ */}
          <TabsContent value="history" className="mt-0">
            <Card className="rounded-2xl border-border/50">
              <CardHeader className="p-3 border-b border-border/40 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  {t('سجل العمليات', 'Operations History')}
                  <Badge variant="secondary" className="text-[9px] tech-content">{history.length}</Badge>
                </CardTitle>
                {history.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] text-muted-foreground" onClick={() => setHistory([])}>
                    <Trash2 className="w-3 h-3 me-1" />{t('مسح الكل', 'Clear all')}
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

        {/* ═══ Tips ═══ */}
        <Card className="rounded-2xl border-border/30 bg-muted/15">
          <CardContent className="p-3">
            <div className="flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-muted-foreground/50 mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium text-foreground">{t('نصائح سريعة', 'Quick Tips')}</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {t(
                    'استخدم Flash للمهام السريعة و Pro للمعقدة • حدد اللهجة للحصول على نتائج دقيقة • عدّل النتيجة وأعد تحسينها • كن محدداً في أسئلتك للمساعد',
                    'Use Flash for quick tasks & Pro for complex • Set tone for accurate results • Edit & re-improve • Be specific with the assistant'
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardAiCenter;
