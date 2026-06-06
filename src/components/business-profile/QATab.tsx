import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HelpCircle, Loader2, MessageCircleQuestion, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBi } from "@/components/common/Bilingual";
import { useMultiJsonLd } from "@/hooks/usePageMeta";
import { useLanguage } from "@/i18n/LanguageContext";

interface QATabProps {
  businessId: string;
  businessName: string;
}

interface PublicQA {
  id: string;
  question: string;
  answer: string;
  answered_at: string | null;
}

export const QATab = ({ businessId, businessName }: QATabProps) => {
  const bi = useBi();
  const { user } = useAuth();
  const { language } = useLanguage();
  const qc = useQueryClient();
  const [question, setQuestion] = useState("");
  const [askerName, setAskerName] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["business-qa-public", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_qa_public" as "business_qa")
        .select("id, question, answer, answered_at")
        .eq("business_id", businessId)
        .order("answered_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PublicQA[];
    },
    enabled: !!businessId,
  });

  // Emit FAQPage JSON-LD for the answered questions (SEO boost).
  useMultiJsonLd(
    items.length > 0
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            inLanguage: language === "ar" ? "ar" : "en",
            name: bi(`أسئلة وأجوبة عن ${businessName}`, `Q&A about ${businessName}`),
            url: typeof window !== "undefined" ? window.location.href : undefined,
            mainEntity: items.slice(0, 20).map((q) => ({
              "@type": "Question",
              name: q.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: q.answer,
                ...(q.answered_at ? { dateCreated: q.answered_at } : {}),
              },
            })),
          },
        ]
      : null,
  );

  const submit = useMutation({
    mutationFn: async () => {
      const trimmed = question.trim();
      if (trimmed.length < 5) throw new Error("too_short");
      const { error } = await supabase.from("business_qa").insert({
        business_id: businessId,
        asker_user_id: user?.id ?? null,
        asker_name: askerName.trim() || null,
        question: trimmed,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bi("تم إرسال سؤالك، سيظهر بعد إجابة الجهة", "Your question was sent — it will appear once answered"));
      setQuestion("");
      void qc.invalidateQueries({ queryKey: ["business-qa-public", businessId] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "unknown";
      if (msg === "too_short") {
        toast.error(bi("السؤال قصير جداً", "Question is too short"));
        return;
      }
      toast.error(bi("تعذّر إرسال السؤال", "Could not send question"));
    },
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-2xl border border-border/40 bg-card p-4 dark:border-border/20 sm:p-5">
        <header className="mb-3 flex items-center gap-2">
          <MessageCircleQuestion className="h-5 w-5 text-accent" />
          <h3 className="font-heading text-base font-bold text-foreground sm:text-lg">
            {bi(`اطرح سؤالاً على ${businessName}`, `Ask ${businessName} a question`)}
          </h3>
        </header>
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {bi(
            "سيظهر سؤالك للعامة بعد أن تجيب الجهة عليه. لا تشارك معلومات شخصية حسّاسة.",
            "Your question becomes public once answered. Avoid sharing sensitive personal data.",
          )}
        </p>
        {!user && (
          <Input
            value={askerName}
            onChange={(e) => setAskerName(e.target.value)}
            placeholder={bi("اسمك (اختياري)", "Your name (optional)")}
            className="mb-2 h-11 rounded-xl"
            dir="auto"
            maxLength={80}
          />
        )}
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={bi("اكتب سؤالك هنا...", "Type your question here...")}
          className="min-h-[96px] rounded-xl"
          dir="auto"
          maxLength={600}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground tech-content">{question.length}/600</span>
          <Button
            variant="hero"
            size="sm"
            className="gap-2"
            onClick={() => submit.mutate()}
            disabled={submit.isPending || question.trim().length < 5}
          >
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {bi("إرسال السؤال", "Send question")}
          </Button>
        </div>
      </section>

      <section>
        <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold text-foreground sm:text-base">
          <HelpCircle className="h-4 w-4 text-accent" />
          {bi("أسئلة وأجوبة", "Questions & answers")}
          {items.length > 0 && (
            <span className="tech-content rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              {items.length}
            </span>
          )}
        </h3>

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/50 bg-muted/20 p-6 text-center text-sm text-muted-foreground dark:bg-muted/10">
            {bi("لا توجد أسئلة منشورة بعد. كن أوّل من يطرح سؤالاً.", "No published questions yet. Be the first to ask.")}
          </div>
        ) : (
          <ul className="space-y-2.5">
            {items.map((qa) => (
              <li
                key={qa.id}
                className="rounded-2xl border border-border/40 bg-card p-3.5 dark:border-border/20 sm:p-4"
              >
                <p className="font-heading text-sm font-semibold text-foreground sm:text-[15px]">
                  <span className="me-2 inline-flex h-5 w-5 items-center justify-center rounded-md bg-accent/15 text-[10px] font-bold text-accent">Q</span>
                  {qa.question}
                </p>
                <p className="mt-2 border-s-2 border-accent/40 ps-3 text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
                  <span className="me-2 inline-flex h-5 w-5 items-center justify-center rounded-md bg-success/15 text-[10px] font-bold text-success">A</span>
                  {qa.answer}
                </p>
                {qa.answered_at && (
                  <p className="mt-2 text-[10px] text-muted-foreground tech-content">
                    {new Date(qa.answered_at).toLocaleDateString()}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default QATab;