/**
 * Admin — PDF Arabic Visual QA Review.
 *
 * Internal-only page for the manual PDF visual QA step in
 * docs/manual-security-production-verification.md §5.
 *
 * Lets a reviewer upload (or drag-drop) two PDF files — a reference baseline
 * and a candidate export — and inspect them side-by-side at full height.
 * Reviewers can capture a quick approval verdict per case and the page keeps
 * a local-only history of recent reviews in localStorage. Nothing is
 * uploaded, persisted server-side, or logged through the export audit.
 *
 * Honours project rules:
 *   - no popups/dialogs (inline cards + fullscreen iframes)
 *   - admin-only (gated via ProtectedRoute requireAdmin in App.tsx)
 *   - noindex (useNoIndex)
 *   - bilingual labels via useLanguage
 *   - localStorage prefix `qitaat_`
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, XCircle, AlertTriangle, Upload, RotateCcw, Trash2, FileText, Eye, Maximize2, Minimize2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type Verdict = 'pass' | 'fail' | 'needs-review';

interface LoadedPdf {
  fileName: string;
  sizeKb: number;
  url: string; // object URL
}

interface HistoryEntry {
  id: string;
  caseLabel: string;
  reference: { fileName: string; sizeKb: number } | null;
  candidate: { fileName: string; sizeKb: number } | null;
  verdict: Verdict;
  notes: string;
  reviewer: string;
  timestamp: string;
}

const HISTORY_KEY = 'qitaat_pdf_visual_qa_history_v1';
const MAX_HISTORY = 20;

const REFERENCE_CASES = [
  { id: 'CT-AR-01', ar: 'عقد قياسي بالعربية', en: 'Standard Arabic contract' },
  { id: 'CT-AR-02', ar: 'جدول كميات مختلط', en: 'Mixed BOQ table' },
  { id: 'CT-AR-03', ar: 'بنود قانونية طويلة', en: 'Long legal clauses' },
  { id: 'CT-AR-04', ar: 'ملحق تعديلات', en: 'Amendments appendix' },
  { id: 'CT-AR-05', ar: 'كتلة QR والتحقق', en: 'QR & verification block' },
  { id: 'CT-AR-06', ar: 'تواقيع متعددة', en: 'Multiple signatures' },
  { id: 'CT-AR-07', ar: 'مرفقات متعددة الصفحات', en: 'Multi-page attachments' },
];

const readHistory = (): HistoryEntry[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
};

const writeHistory = (entries: HistoryEntry[]) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
  } catch {
    /* ignore quota */
  }
};

const verdictBadge = (v: Verdict, isRTL: boolean) => {
  if (v === 'pass') {
    return (
      <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="w-3 h-3" />
        {isRTL ? 'مقبول' : 'Pass'}
      </Badge>
    );
  }
  if (v === 'fail') {
    return (
      <Badge variant="outline" className="gap-1 border-destructive/40 text-destructive">
        <XCircle className="w-3 h-3" />
        {isRTL ? 'مرفوض' : 'Fail'}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-700 dark:text-amber-300">
      <AlertTriangle className="w-3 h-3" />
      {isRTL ? 'بحاجة مراجعة' : 'Needs review'}
    </Badge>
  );
};

interface UploadSlotProps {
  label: string;
  hint: string;
  loaded: LoadedPdf | null;
  onFile: (f: File) => void;
  onClear: () => void;
  isRTL: boolean;
  inputId: string;
}

const UploadSlot: React.FC<UploadSlotProps> = ({ label, hint, loaded, onFile, onClear, isRTL, inputId }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast({ title: isRTL ? 'ملف غير مدعوم' : 'Unsupported file', description: isRTL ? 'يجب اختيار ملف PDF.' : 'Please choose a PDF file.', variant: 'destructive' });
      return;
    }
    onFile(file);
  };

  return (
    <div
      className={`rounded-xl border-2 border-dashed transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-border/60 bg-card'}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
    >
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
          {loaded && (
            <p className="text-xs mt-2 tech-content truncate" title={loaded.fileName}>
              <FileText className="inline w-3 h-3 mx-1" />
              {loaded.fileName} · {loaded.sizeKb.toLocaleString()} KB
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {loaded && (
            <Button variant="ghost" size="sm" onClick={onClear} className="gap-1 text-xs">
              <Trash2 className="w-3.5 h-3.5" />
              {isRTL ? 'إزالة' : 'Clear'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} className="gap-1 text-xs">
            <Upload className="w-3.5 h-3.5" />
            {loaded ? (isRTL ? 'استبدال' : 'Replace') : (isRTL ? 'اختر ملف' : 'Choose file')}
          </Button>
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </div>
    </div>
  );
};

interface PdfViewerProps {
  title: string;
  pdf: LoadedPdf | null;
  isRTL: boolean;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ title, pdf, isRTL }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* ignore unsupported */
    }
  };

  return (
    <div ref={containerRef} className="rounded-lg border bg-muted/30 overflow-hidden flex flex-col">
      <div className="px-3 py-2 border-b bg-card flex items-center justify-between">
        <span className="text-xs font-medium">{title}</span>
        <div className="flex items-center gap-2">
          {pdf && (
            <span className="text-[10px] text-muted-foreground tech-content truncate max-w-[120px]" title={pdf.fileName}>
              {pdf.fileName}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="gap-1 text-xs h-7 px-2"
            disabled={!pdf}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                {isRTL ? 'تصغير' : 'Exit'}
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                {isRTL ? 'تكبير' : 'Fullscreen'}
              </>
            )}
          </Button>
        </div>
      </div>
      <div className="h-[70vh] min-h-[480px] bg-muted">
        {pdf ? (
          <iframe src={pdf.url} title={title} className="w-full h-full" />
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground p-4 text-center">
            {isRTL ? 'لم يتم تحميل ملف بعد.' : 'No file loaded yet.'}
          </div>
        )}
      </div>
    </div>
  );
};

const AdminPdfVisualQa: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();

  const [reference, setReference] = useState<LoadedPdf | null>(null);
  const [candidate, setCandidate] = useState<LoadedPdf | null>(null);
  const [caseLabel, setCaseLabel] = useState<string>(REFERENCE_CASES[0].id);
  const [reviewer, setReviewer] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [verdict, setVerdict] = useState<Verdict>('needs-review');
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => { setHistory(readHistory()); }, []);

  // Revoke object URLs on unmount/replace.
  useEffect(() => () => {
    if (reference) URL.revokeObjectURL(reference.url);
  }, [reference]);
  useEffect(() => () => {
    if (candidate) URL.revokeObjectURL(candidate.url);
  }, [candidate]);

  const loadPdf = useCallback((file: File): LoadedPdf => ({
    fileName: file.name,
    sizeKb: Math.round(file.size / 1024),
    url: URL.createObjectURL(file),
  }), []);

  const setReferenceFile = (file: File) => {
    if (reference) URL.revokeObjectURL(reference.url);
    setReference(loadPdf(file));
  };
  const setCandidateFile = (file: File) => {
    if (candidate) URL.revokeObjectURL(candidate.url);
    setCandidate(loadPdf(file));
  };

  const clearReference = () => { if (reference) URL.revokeObjectURL(reference.url); setReference(null); };
  const clearCandidate = () => { if (candidate) URL.revokeObjectURL(candidate.url); setCandidate(null); };

  const resetAll = () => {
    clearReference();
    clearCandidate();
    setNotes('');
    setVerdict('needs-review');
  };

  const canSave = useMemo(
    () => (reference !== null || candidate !== null) && reviewer.trim().length > 0,
    [reference, candidate, reviewer],
  );

  const saveDecision = () => {
    if (!canSave) {
      toast({
        title: isRTL ? 'بيانات ناقصة' : 'Missing details',
        description: isRTL ? 'أدخل اسم المراجع وحمّل ملف PDF واحد على الأقل.' : 'Enter the reviewer name and upload at least one PDF.',
        variant: 'destructive',
      });
      return;
    }
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      caseLabel,
      reference: reference ? { fileName: reference.fileName, sizeKb: reference.sizeKb } : null,
      candidate: candidate ? { fileName: candidate.fileName, sizeKb: candidate.sizeKb } : null,
      verdict,
      notes: notes.trim(),
      reviewer: reviewer.trim(),
      timestamp: new Date().toISOString(),
    };
    const next = [entry, ...history];
    setHistory(next);
    writeHistory(next);
    toast({
      title: isRTL ? 'تم حفظ القرار' : 'Decision saved',
      description: isRTL ? 'محفوظ محلياً على هذا الجهاز فقط.' : 'Stored locally on this device only.',
    });
  };

  const clearHistory = () => {
    setHistory([]);
    writeHistory([]);
  };

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-heading font-semibold">
            {isRTL ? 'مراجعة بصرية لملفات PDF العربية' : 'PDF Arabic Visual QA Review'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isRTL
              ? 'حمّل ملف مرجعي وملف مرشّح لمقارنة التخطيط جنباً إلى جنب وتسجيل قرار الاعتماد. كل البيانات تبقى على جهازك.'
              : 'Upload a reference baseline and a candidate export to compare layouts side-by-side and record an approval verdict. All data stays on this device.'}
          </p>
        </header>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {isRTL ? 'تفاصيل الحالة' : 'Case details'}
            </CardTitle>
            <CardDescription>
              {isRTL ? 'اختر الحالة المرجعية من قائمة QA رقم 5.' : 'Pick the reference case from QA §5.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {isRTL ? 'الحالة المرجعية' : 'Reference case'}
              </label>
              <select
                value={caseLabel}
                onChange={(e) => setCaseLabel(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {REFERENCE_CASES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} — {isRTL ? c.ar : c.en}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="qa-reviewer">
                {isRTL ? 'المراجع' : 'Reviewer'}
              </label>
              <Input
                id="qa-reviewer"
                value={reviewer}
                onChange={(e) => setReviewer(e.target.value)}
                placeholder={isRTL ? 'الاسم أو معرف الموظف' : 'Name or staff ID'}
                dir="auto"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {isRTL ? 'القرار' : 'Verdict'}
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant={verdict === 'pass' ? 'default' : 'outline'} onClick={() => setVerdict('pass')} className="gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isRTL ? 'مقبول' : 'Pass'}
                </Button>
                <Button type="button" size="sm" variant={verdict === 'fail' ? 'destructive' : 'outline'} onClick={() => setVerdict('fail')} className="gap-1">
                  <XCircle className="w-3.5 h-3.5" />
                  {isRTL ? 'مرفوض' : 'Fail'}
                </Button>
                <Button type="button" size="sm" variant={verdict === 'needs-review' ? 'secondary' : 'outline'} onClick={() => setVerdict('needs-review')} className="gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {isRTL ? 'بحاجة مراجعة' : 'Needs review'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <UploadSlot
            inputId="qa-ref"
            label={isRTL ? 'الملف المرجعي (المعتمد)' : 'Reference (approved baseline)'}
            hint={isRTL ? 'اسحب وأفلت أو اختر ملف PDF.' : 'Drag-and-drop or choose a PDF file.'}
            loaded={reference}
            onFile={setReferenceFile}
            onClear={clearReference}
            isRTL={isRTL}
          />
          <UploadSlot
            inputId="qa-cand"
            label={isRTL ? 'الملف المرشّح (التصدير الجديد)' : 'Candidate (new export)'}
            hint={isRTL ? 'اسحب وأفلت أو اختر ملف PDF.' : 'Drag-and-drop or choose a PDF file.'}
            loaded={candidate}
            onFile={setCandidateFile}
            onClear={clearCandidate}
            isRTL={isRTL}
          />
        </div>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4" />
                {isRTL ? 'مقارنة جنباً إلى جنب' : 'Side-by-side comparison'}
              </CardTitle>
              <CardDescription>
                {isRTL ? 'استخدم شريط التمرير داخل كل إطار للتنقل بين الصفحات.' : 'Scroll inside each frame to navigate pages.'}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={resetAll} className="gap-1">
              <RotateCcw className="w-3.5 h-3.5" />
              {isRTL ? 'إعادة تعيين' : 'Reset'}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <PdfViewer
                title={isRTL ? 'مرجعي' : 'Reference'}
                pdf={reference}
                isRTL={isRTL}
              />
              <PdfViewer
                title={isRTL ? 'مرشّح' : 'Candidate'}
                pdf={candidate}
                isRTL={isRTL}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {isRTL ? 'ملاحظات وقرار' : 'Notes & decision'}
            </CardTitle>
            <CardDescription>
              {isRTL
                ? 'اذكر تشكيل الأحرف العربية، اتجاه الجداول، انكسار الصفحات، تداخل التواقيع، أو أي تسريب للبيانات.'
                : 'Note Arabic shaping, table direction, page breaks, signature overlap, or any data leakage.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder={isRTL ? 'ملاحظات المراجعة...' : 'Review notes...'}
              dir="auto"
            />
            <div className="flex flex-wrap items-center gap-2 justify-end">
              {verdictBadge(verdict, isRTL)}
              <Button onClick={saveDecision} disabled={!canSave} className="gap-1">
                <CheckCircle2 className="w-4 h-4" />
                {isRTL ? 'حفظ القرار محلياً' : 'Save decision locally'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">
                {isRTL ? 'سجل المراجعات الأخيرة' : 'Recent reviews'}
              </CardTitle>
              <CardDescription>
                {isRTL ? `محفوظ محلياً (آخر ${MAX_HISTORY}).` : `Stored locally (last ${MAX_HISTORY}).`}
              </CardDescription>
            </div>
            {history.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearHistory} className="gap-1 text-xs">
                <Trash2 className="w-3.5 h-3.5" />
                {isRTL ? 'مسح السجل' : 'Clear history'}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'لا توجد مراجعات بعد.' : 'No reviews yet.'}
              </p>
            ) : (
              <ul className="space-y-2">
                {history.map((h, idx) => (
                  <li key={h.id}>
                    {idx > 0 && <Separator className="mb-2" />}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{h.caseLabel}</span>
                          {verdictBadge(h.verdict, isRTL)}
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(h.timestamp).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}
                          </span>
                          <span className="text-[11px] text-muted-foreground">· {h.reviewer}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1 tech-content truncate">
                          {isRTL ? 'مرجعي: ' : 'Ref: '}{h.reference?.fileName ?? '—'}
                          {' · '}
                          {isRTL ? 'مرشّح: ' : 'Cand: '}{h.candidate?.fileName ?? '—'}
                        </div>
                        {h.notes && (
                          <p className="text-xs mt-1 whitespace-pre-wrap">{h.notes}</p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </DashboardLayout>
  );
};

export default AdminPdfVisualQa;