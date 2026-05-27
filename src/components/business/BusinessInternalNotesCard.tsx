import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pin, PinOff, Trash2, StickyNote, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  listBusinessInternalNotes,
  insertBusinessInternalNote,
  updateBusinessInternalNote,
  softDeleteBusinessInternalNote,
  type BusinessInternalNote,
} from "@/modules/businesses/notes";

interface Props {
  businessId: string;
}

/**
 * Self-contained card for viewing + adding internal notes against a business.
 * RLS controls visibility/insert permissions; UI degrades gracefully when the
 * caller cannot write.
 */
export function BusinessInternalNotesCard({ businessId }: Props) {
  const { user } = useAuth();
  const { isRTL } = useLanguage();

  const [notes, setNotes] = useState<BusinessInternalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const tx = useMemo(
    () => ({
      title: isRTL ? "ملاحظات داخلية" : "Internal notes",
      add: isRTL ? "إضافة ملاحظة" : "Add note",
      placeholder: isRTL ? "اكتب ملاحظة داخلية…" : "Write an internal note…",
      empty: isRTL ? "لا توجد ملاحظات بعد." : "No notes yet.",
      loading: isRTL ? "جارٍ التحميل…" : "Loading…",
      errorLoad: isRTL ? "تعذّر تحميل الملاحظات." : "Failed to load notes.",
      errorSave: isRTL ? "تعذّر حفظ الملاحظة." : "Failed to save note.",
      pin: isRTL ? "تثبيت" : "Pin",
      unpin: isRTL ? "إلغاء التثبيت" : "Unpin",
      del: isRTL ? "حذف" : "Delete",
      loginRequired: isRTL ? "تسجيل الدخول مطلوب." : "Sign in required.",
    }),
    [isRTL],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await listBusinessInternalNotes({ businessId });
    if (err) setError(tx.errorLoad);
    setNotes(data ?? []);
    setLoading(false);
  }, [businessId, tx.errorLoad]);

  useEffect(() => {
    if (businessId) void reload();
  }, [businessId, reload]);

  const handleSubmit = async () => {
    if (!user) return;
    const body = draft.trim();
    if (body.length === 0) return;
    setSubmitting(true);
    setError(null);
    const { error: err } = await insertBusinessInternalNote({
      business_id: businessId,
      author_user_id: user.id,
      body,
    });
    setSubmitting(false);
    if (err) {
      setError(tx.errorSave);
      return;
    }
    setDraft("");
    void reload();
  };

  const handleTogglePin = async (note: BusinessInternalNote) => {
    await updateBusinessInternalNote(note.id, { pinned: !note.pinned });
    void reload();
  };

  const handleDelete = async (note: BusinessInternalNote) => {
    await softDeleteBusinessInternalNote(note.id);
    void reload();
  };

  return (
    <section
      dir={isRTL ? "rtl" : "ltr"}
      className="rounded-2xl border border-border/50 bg-card p-5 space-y-4"
      aria-label={tx.title}
    >
      <header className="flex items-center gap-2">
        <StickyNote className="w-4 h-4 text-accent" />
        <h2 className="font-heading font-semibold text-base text-foreground">{tx.title}</h2>
      </header>

      {user ? (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={tx.placeholder}
            dir="auto"
            maxLength={4000}
            rows={3}
            className="rounded-xl"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={submitting || draft.trim().length === 0}
              className="rounded-xl h-10"
              size="sm"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              {tx.add}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{tx.loginRequired}</p>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {tx.loading}
        </div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tx.empty}</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border p-3 text-sm bg-background/40 ${
                n.pinned ? "border-accent/40" : "border-border/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="whitespace-pre-wrap break-words text-foreground flex-1" dir="auto">
                  {n.body}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleTogglePin(n)}
                    aria-label={n.pinned ? tx.unpin : tx.pin}
                  >
                    {n.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  </Button>
                  {user?.id === n.author_user_id && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(n)}
                      aria-label={tx.del}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              {n.ref_id && (
                <p className="mt-1 text-[10px] font-mono text-muted-foreground tech-content">
                  {n.ref_id}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default BusinessInternalNotesCard;