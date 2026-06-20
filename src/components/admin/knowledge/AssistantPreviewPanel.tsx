/**
 * Phase 7 — Assistant Preview Panel.
 *
 * Read-only, local-state-only laboratory inside `/admin/knowledge` for
 * exercising the unified assistant pipeline:
 *
 *   buildAssistantKnowledgeAnswerContext  →  knowledgeRegistry
 *
 * STRICT rules (enforced by Phase-7 tests):
 *  - Uses ONLY the in-process registry. No DB, no RPC, no edge function,
 *    no fetch, no external API, no embeddings, no vector store.
 *  - Never sends a message, never stores the question, never creates a
 *    ticket / notification / log row. Local React state only.
 *  - When `allowedToAnswer=false` the panel shows the canonical fallback
 *    plus an escalation hint — it never fabricates an answer.
 *  - Audience guardrails are inherited from the underlying context
 *    builder: visitor/customer/provider/business_owner can never see
 *    internal-ops items here.
 */
import React, { useState } from 'react';
import { Bot, Send, ShieldAlert, ExternalLink, FileText, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  buildAssistantKnowledgeAnswerContext,
  type AssistantAnswerContext,
} from '@/modules/knowledge/assistant/assistantKnowledgeContext';
import type { KnowledgeAudience, KnowledgeLocale } from '@/modules/knowledge';
import { KNOWLEDGE_ASSISTANT_RELEASE_GATE } from '@/modules/knowledge/release/knowledgeAssistantReleaseGate';

const AUDIENCE_OPTIONS: ReadonlyArray<{ value: KnowledgeAudience; label: string }> = [
  { value: 'visitor', label: 'زائر' },
  { value: 'customer', label: 'عميل' },
  { value: 'provider', label: 'مزوّد' },
  { value: 'business_owner', label: 'صاحب عمل' },
  { value: 'admin', label: 'أدمن' },
  { value: 'operations', label: 'تشغيل' },
];

const LOCALE_OPTIONS: ReadonlyArray<{ value: KnowledgeLocale; label: string }> = [
  { value: 'ar', label: 'العربية' },
  { value: 'en', label: 'English' },
];

const FALLBACK_MESSAGE =
  'لا توجد معلومة موثقة كافية في مركز المعرفة للإجابة على هذا السؤال.';
const ESCALATION_HINT =
  'يمكن تصعيد السؤال لفريق الدعم أو إضافة مقال معرفة جديد.';
const LOW_CONFIDENCE_THRESHOLD = 0.4;

const AssistantPreviewPanel: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [audience, setAudience] = useState<KnowledgeAudience>('customer');
  const [locale, setLocale] = useState<KnowledgeLocale>('ar');
  const [result, setResult] = useState<AssistantAnswerContext | null>(null);

  const handleTest = (): void => {
    const trimmed = question.trim();
    if (trimmed.length === 0) {
      setResult(null);
      return;
    }
    // Pure in-process read — no network, no persistence.
    const ctx = buildAssistantKnowledgeAnswerContext(trimmed, audience, locale);
    setResult(ctx);
  };

  const topBody = result?.matchedItems[0]
    ? locale === 'en' && result.matchedItems[0].item.body.en
      ? result.matchedItems[0].item.body.en
      : result.matchedItems[0].item.body.ar
    : '';
  const lowConfidence =
    result?.allowedToAnswer && result.confidence < LOW_CONFIDENCE_THRESHOLD;

  return (
    <div className="space-y-4" data-testid="knowledge-assistant-preview">
      <Card
        className="border-warning/40 bg-warning/5"
        data-testid="assistant-preview-internal-only-notice"
      >
        <CardContent className="p-3 sm:p-4 space-y-1 text-xs">
          <div className="flex items-center gap-2 font-semibold text-warning">
            <ShieldAlert className="h-4 w-4" />
            <span>
              وضع التشغيل الحالي: داخلي فقط ({KNOWLEDGE_ASSISTANT_RELEASE_GATE.releaseLevel})
            </span>
          </div>
          <ul className="ms-6 list-disc space-y-0.5 text-muted-foreground">
            <li>لا إرسال رسائل.</li>
            <li>لا حفظ محادثات.</li>
            <li>لا إطلاق عام أو داخل داشبورد المستخدمين/المزودين.</li>
            <li>يعتمد على مركز المعرفة فقط — لا API خارجي ولا embeddings.</li>
            <li>يجب مراجعة الرد بشريًا قبل استخدامه مع أي عميل.</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Bot className="h-4 w-4" />
            <span>
              معاينة محلية لمساعد المعرفة. لا يتم إرسال رسائل، ولا حفظ الأسئلة،
              ولا استدعاء أي API خارجي.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="md:col-span-3">
              <label className="text-[11px] text-muted-foreground" htmlFor="assistant-preview-question">
                السؤال
              </label>
              <Input
                id="assistant-preview-question"
                data-testid="assistant-preview-question"
                value={question}
                dir="auto"
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="مثال: كيف أطلب عرض سعر؟"
                className="h-10"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">الجمهور</label>
              <Select value={audience} onValueChange={(v) => setAudience(v as KnowledgeAudience)}>
                <SelectTrigger className="h-9 text-xs" data-testid="assistant-preview-audience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">اللغة</label>
              <Select value={locale} onValueChange={(v) => setLocale(v as KnowledgeLocale)}>
                <SelectTrigger className="h-9 text-xs" data-testid="assistant-preview-locale">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCALE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleTest}
                disabled={question.trim().length === 0}
                className="h-9 w-full gap-2"
                data-testid="assistant-preview-submit"
              >
                <Send className="h-4 w-4" />
                اختبار الإجابة
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-border/60" data-testid="assistant-preview-result">
          <CardContent className="p-3 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={result.allowedToAnswer ? 'default' : 'secondary'}
                data-testid="assistant-preview-allowed"
              >
                {result.allowedToAnswer ? 'يمكن الإجابة' : 'لا يمكن الإجابة'}
              </Badge>
              <Badge variant="outline" data-testid="assistant-preview-confidence">
                الثقة:&nbsp;
                <span className="tech-content tabular-nums ms-1">
                  {(result.confidence * 100).toFixed(0)}%
                </span>
              </Badge>
              {lowConfidence && (
                <Badge variant="outline" className="gap-1 text-warning border-warning/40">
                  <AlertTriangle className="h-3 w-3" />
                  ثقة منخفضة
                </Badge>
              )}
            </div>

            {result.allowedToAnswer ? (
              <div data-testid="assistant-preview-answer">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                  الإجابة المقترحة
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-line">{topBody}</p>
              </div>
            ) : (
              <div
                className="rounded-xl border border-warning/30 bg-warning/5 p-3 space-y-1"
                data-testid="assistant-preview-fallback"
              >
                <div className="flex items-center gap-2 text-warning">
                  <ShieldAlert className="h-4 w-4" />
                  <p className="text-sm font-semibold">{FALLBACK_MESSAGE}</p>
                </div>
                <p className="text-xs text-muted-foreground">{ESCALATION_HINT}</p>
              </div>
            )}

            {result.sources.length > 0 && (
              <div data-testid="assistant-preview-sources">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                  المصادر
                </p>
                <ul className="space-y-1">
                  {result.sources.map((s, idx) => (
                    <li
                      key={`${s}-${idx}`}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <FileText className="h-3 w-3 opacity-70" />
                      <span className="tech-content">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.matchedItems.length > 0 && (
              <div data-testid="assistant-preview-categories">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                  الأقسام
                </p>
                <div className="flex flex-wrap gap-1">
                  {Array.from(
                    new Set(
                      result.matchedItems
                        .map((m) => m.item.categoryId)
                        .filter((c): c is string => Boolean(c)),
                    ),
                  ).map((c) => (
                    <Badge key={c} variant="secondary" className="text-[10px]">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {result.relatedRoutes.length > 0 && (
              <div data-testid="assistant-preview-routes">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                  مسارات ذات صلة
                </p>
                <ul className="space-y-0.5">
                  {result.relatedRoutes.map((r) => (
                    <li key={r} className="flex items-center gap-1.5 text-xs">
                      <ExternalLink className="h-3 w-3 opacity-70" />
                      <span className="tech-content">{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!result.allowedToAnswer && (
              <p
                className="text-[11px] text-muted-foreground"
                data-testid="assistant-preview-block-reason"
              >
                سبب المنع: لم يبلغ أعلى عنصر معرفي حدّ التطابق المطلوب
                (ASSISTANT_TOKEN_HIT_THRESHOLD) أو لم تتوفر عناصر مسموحة لهذا
                الجمهور.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AssistantPreviewPanel;
